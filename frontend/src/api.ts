export interface Health {
  provider: string
  demo: boolean
  maxUploadMb: number
}

export interface TryOnResult {
  image: string
  provider: string
  ms: number
}

export interface TryOnOptions {
  keepColor: boolean
  notes: string
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error ?? `The server answered ${res.status}. Is the PHP backend running?`)
  }
  return data as T
}

export async function getHealth(): Promise<Health> {
  return readJson<Health>(await fetch('/api/health'))
}

export async function tryOn(
  selfie: Blob,
  inspiration: Blob,
  options: TryOnOptions,
  signal?: AbortSignal,
): Promise<TryOnResult> {
  const body = new FormData()
  body.append('selfie', selfie, 'selfie.jpg')
  body.append('inspiration', inspiration, 'inspiration.jpg')
  body.append('keepColor', options.keepColor ? '1' : '0')
  body.append('notes', options.notes)
  return readJson<TryOnResult>(await fetch('/api/try-on', { method: 'POST', body, signal }))
}
