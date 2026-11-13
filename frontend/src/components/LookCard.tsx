import { useEffect, useState } from 'react'
import type { Look } from '../types'
import { CompareSlider } from './CompareSlider'

interface Props {
  look: Look
  selfieUrl: string | null
  onRename: (name: string) => void
  onRemove: () => void
  onRun: () => void
  onExpand: () => void
}

function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    setSeconds(0)
    const started = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [running])
  return seconds
}

export function LookCard({ look, selfieUrl, onRename, onRemove, onRun, onExpand }: Props) {
  const working = look.status === 'working'
  const elapsed = useElapsed(working)
  const title = look.name.trim() || 'Untitled look'

  return (
    <article className={`look look-${look.status}`}>
      <div className="look-stage">
        {look.status === 'done' && look.resultUrl && selfieUrl ? (
          <CompareSlider before={selfieUrl} after={look.resultUrl} alt={`You with the ${title} hairstyle`} />
        ) : (
          <img className="look-inspo-large" src={look.previewUrl} alt={`Hairstyle inspiration: ${title}`} />
        )}

        {working && (
          <div className="look-overlay" role="status">
            <div className="spinner" aria-hidden />
            <p>Styling your hair…</p>
            <small>{elapsed}s · usually 10–40s</small>
          </div>
        )}
        {look.status === 'queued' && (
          <div className="look-overlay look-overlay-soft" role="status">
            <p>In the chair queue</p>
          </div>
        )}
        {look.status === 'done' && (
          <img className="look-inspo-pip" src={look.previewUrl} alt="" aria-hidden />
        )}
      </div>

      <div className="look-body">
        <input
          className="look-name"
          value={look.name}
          placeholder="Name this look (e.g. Zendaya bob)"
          onChange={(e) => onRename(e.target.value)}
          aria-label="Look name"
        />

        {look.status === 'error' && <p className="look-error">{look.error}</p>}

        <div className="look-actions">
          {look.status === 'done' && look.resultUrl && (
            <>
              <button type="button" className="btn btn-quiet" onClick={onExpand}>
                View large
              </button>
              <a
                className="btn btn-quiet"
                href={look.resultUrl}
                download={`celebhair-${(look.name || 'look').replace(/\W+/g, '-').toLowerCase()}.png`}
              >
                Download
              </a>
            </>
          )}
          {(look.status === 'done' || look.status === 'error') && (
            <button type="button" className="btn btn-quiet" onClick={onRun} disabled={!selfieUrl}>
              {look.status === 'error' ? 'Retry' : 'Regenerate'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-quiet btn-danger"
            onClick={onRemove}
            disabled={working}
            aria-label={`Remove ${title}`}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  )
}
