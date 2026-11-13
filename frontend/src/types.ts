export type LookStatus = 'idle' | 'queued' | 'working' | 'done' | 'error'

export interface Look {
  id: string
  name: string
  /** Downsized JPEG that gets uploaded. */
  image: Blob
  previewUrl: string
  status: LookStatus
  resultUrl?: string
  error?: string
}

export interface Selfie {
  image: Blob
  previewUrl: string
}
