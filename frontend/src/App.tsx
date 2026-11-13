import { useCallback, useEffect, useRef, useState } from 'react'
import { getHealth, tryOn, type Health, type TryOnOptions } from './api'
import { imageFiles, nameFromFile, prepareImage } from './images'
import type { Look, Selfie } from './types'
import { DropZone } from './components/DropZone'
import { LookCard } from './components/LookCard'
import { CompareSlider } from './components/CompareSlider'

const CONCURRENCY = 2

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<Selfie | null>(null)
  const [looks, setLooks] = useState<Look[]>([])
  const [options, setOptions] = useState<TryOnOptions>({ keepColor: false, notes: '' })
  const [notice, setNotice] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // The queue runs outside React's render cycle, so it reads the latest values through refs.
  const selfieRef = useRef(selfie)
  const looksRef = useRef(looks)
  const optionsRef = useRef(options)
  useEffect(() => {
    selfieRef.current = selfie
    looksRef.current = looks
    optionsRef.current = options
  })
  const queue = useRef<string[]>([])
  const active = useRef(0)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e: Error) => setHealthError(e.message))
  }, [])

  const updateLook = useCallback((id: string, patch: Partial<Look>) => {
    setLooks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }, [])

  const pump = useCallback(() => {
    while (active.current < CONCURRENCY && queue.current.length > 0) {
      const id = queue.current.shift()!
      const look = looksRef.current.find((l) => l.id === id)
      const usedSelfie = selfieRef.current
      if (!look || !usedSelfie) continue

      active.current++
      updateLook(id, { status: 'working', error: undefined })
      tryOn(usedSelfie.image, look.image, optionsRef.current)
        .then((result) => {
          // Drop results made with a selfie the user has since replaced.
          if (selfieRef.current !== usedSelfie) return updateLook(id, { status: 'idle' })
          updateLook(id, { status: 'done', resultUrl: result.image })
        })
        .catch((e: Error) => updateLook(id, { status: 'error', error: e.message }))
        .finally(() => {
          active.current--
          pump()
        })
    }
  }, [updateLook])

  const run = useCallback(
    (ids: string[]) => {
      const fresh = ids.filter((id) => !queue.current.includes(id))
      if (fresh.length === 0) return
      queue.current.push(...fresh)
      setLooks((prev) => prev.map((l) => (fresh.includes(l.id) ? { ...l, status: 'queued', error: undefined } : l)))
      pump()
    },
    [pump],
  )

  const showError = (e: unknown) => setNotice(e instanceof Error ? e.message : String(e))

  const chooseSelfie = async (file: File) => {
    try {
      const image = await prepareImage(file)
      if (selfie) URL.revokeObjectURL(selfie.previewUrl)
      setSelfie({ image, previewUrl: URL.createObjectURL(image) })
      // Old results belong to the old selfie.
      setLooks((prev) =>
        prev.map((l) => (l.status === 'done' || l.status === 'error' ? { ...l, status: 'idle', resultUrl: undefined } : l)),
      )
      setNotice(null)
    } catch (e) {
      showError(e)
    }
  }

  const addLooks = useCallback(async (files: File[]) => {
    try {
      const added = await Promise.all(
        files.map(async (file): Promise<Look> => {
          const image = await prepareImage(file)
          return {
            id: crypto.randomUUID(),
            name: nameFromFile(file),
            image,
            previewUrl: URL.createObjectURL(image),
            status: 'idle',
          }
        }),
      )
      setLooks((prev) => [...prev, ...added])
      setNotice(null)
    } catch (e) {
      showError(e)
    }
  }, [])

  const removeLook = (id: string) => {
    queue.current = queue.current.filter((q) => q !== id)
    setLooks((prev) => {
      const gone = prev.find((l) => l.id === id)
      if (gone) URL.revokeObjectURL(gone.previewUrl)
      return prev.filter((l) => l.id !== id)
    })
  }

  // Paste screenshots of celeb hair straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return
      const files = imageFiles(e.clipboardData?.items)
      if (files.length) {
        e.preventDefault()
        addLooks(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addLooks])

  useEffect(() => {
    if (!expandedId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpandedId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expandedId])

  const pending = looks.filter((l) => l.status === 'idle' || l.status === 'error')
  const busy = looks.some((l) => l.status === 'working' || l.status === 'queued')
  const expanded = looks.find((l) => l.id === expandedId && l.resultUrl)

  return (
    <div className="page">
      <header className="masthead">
        <p className="kicker">Virtual salon</p>
        <h1>
          Celeb<em>Hair</em>
        </h1>
        <p className="lede">
          Upload a selfie, add the celebrity hairstyles you've been screenshotting, and see yourself wearing each one
          before you book the cut.
        </p>
      </header>

      {healthError && (
        <div className="banner banner-error">
          Can't reach the PHP backend ({healthError}). Start it with <code>npm run dev</code> in <code>frontend/</code>.
        </div>
      )}
      {health?.demo && (
        <div className="banner">
          <strong>Demo mode.</strong> No AI key is configured, so results only preview the flow. Add a{' '}
          <code>GEMINI_API_KEY</code> or <code>OPENAI_API_KEY</code> to <code>backend/.env</code> for real try-ons.
        </div>
      )}
      {notice && (
        <div className="banner banner-error" role="alert">
          {notice}
          <button type="button" className="banner-close" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <main className="layout">
        <section className="panel you" aria-labelledby="you-title">
          <h2 id="you-title">
            <span className="step">01</span> You
          </h2>

          <DropZone
            label={selfie ? 'Replace your selfie' : 'Upload your selfie'}
            onFiles={(files) => chooseSelfie(files[0])}
            className={`selfie-drop ${selfie ? 'has-image' : ''}`}
          >
            {selfie ? (
              <>
                <img src={selfie.previewUrl} alt="Your selfie" />
                <span className="selfie-change">Change photo</span>
              </>
            ) : (
              <div className="drop-copy">
                <span className="drop-icon" aria-hidden>
                  ◐
                </span>
                <strong>Add your selfie</strong>
                <span>Face the camera, hair visible, good light.</span>
              </div>
            )}
          </DropZone>

          <fieldset className="options">
            <legend className="sr-only">Options</legend>
            <label className="toggle">
              <input
                type="checkbox"
                checked={options.keepColor}
                onChange={(e) => setOptions((o) => ({ ...o, keepColor: e.target.checked }))}
              />
              <span>
                Keep my hair colour
                <small>Only the cut and styling change</small>
              </span>
            </label>
            <label className="notes">
              <span>Note for the stylist (optional)</span>
              <textarea
                rows={2}
                maxLength={300}
                placeholder="e.g. a bit shorter, curtain bangs"
                value={options.notes}
                onChange={(e) => setOptions((o) => ({ ...o, notes: e.target.value }))}
              />
            </label>
          </fieldset>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!selfie || pending.length === 0}
            onClick={() => run(pending.map((l) => l.id))}
          >
            {busy && pending.length === 0
              ? 'Styling…'
              : pending.length > 0
                ? `Try on ${pending.length} ${pending.length === 1 ? 'look' : 'looks'}`
                : 'Try on looks'}
          </button>
          {!selfie && looks.length > 0 && <p className="hint">Add your selfie to start.</p>}
          {health && !health.demo && <p className="hint">Styled by {health.provider}</p>}
        </section>

        <section className="panel looks" aria-labelledby="looks-title">
          <h2 id="looks-title">
            <span className="step">02</span> The looks
          </h2>

          {looks.length === 0 ? (
            <DropZone label="Add hairstyle inspiration photos" multiple onFiles={addLooks} className="looks-empty">
              <div className="drop-copy">
                <span className="drop-icon" aria-hidden>
                  ✂
                </span>
                <strong>Drop your hair inspo here</strong>
                <span>Red-carpet shots, screenshots, Pinterest saves. Add as many as you like.</span>
                <span className="kbd-hint">
                  or paste with <kbd>Ctrl</kbd> + <kbd>V</kbd>
                </span>
              </div>
            </DropZone>
          ) : (
            <div className="grid">
              {looks.map((look) => (
                <LookCard
                  key={look.id}
                  look={look}
                  selfieUrl={selfie?.previewUrl ?? null}
                  onRename={(name) => updateLook(look.id, { name })}
                  onRemove={() => removeLook(look.id)}
                  onRun={() => run([look.id])}
                  onExpand={() => setExpandedId(look.id)}
                />
              ))}
              <DropZone label="Add more hairstyle photos" multiple onFiles={addLooks} className="add-tile">
                <div className="drop-copy">
                  <span className="drop-icon" aria-hidden>
                    +
                  </span>
                  <strong>Add more looks</strong>
                  <span>Drop, browse or paste</span>
                </div>
              </DropZone>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        Photos are sent to the AI provider only to generate your try-ons and are not stored by this app.
      </footer>

      {expanded && selfie && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={expanded.name || 'Try-on result'} onClick={() => setExpandedId(null)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <CompareSlider before={selfie.previewUrl} after={expanded.resultUrl!} alt={`You with the ${expanded.name || 'new'} hairstyle`} />
            <div className="modal-bar">
              <span>{expanded.name || 'Untitled look'}</span>
              <button type="button" className="btn btn-quiet" onClick={() => setExpandedId(null)} autoFocus>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
