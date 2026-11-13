/**
 * Decodes any image the browser can read, applies EXIF orientation, downsizes it and
 * re-encodes it as JPEG. Keeps uploads small and lets phone photos "just work".
 */
export async function prepareImage(file: Blob, maxSide = 1536): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("Couldn't read that image. Try a JPEG, PNG or WebP.")
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image.'))), 'image/jpeg', 0.9),
  )
}

export function imageFiles(list: FileList | DataTransferItemList | null | undefined): File[] {
  if (!list) return []
  const files: File[] = []
  for (const entry of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const file = entry instanceof File ? entry : entry.kind === 'file' ? entry.getAsFile() : null
    if (file && file.type.startsWith('image/')) files.push(file)
  }
  return files
}

/** "zendaya_met-gala.jpg" -> "Zendaya met gala" */
export function nameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').trim()
  if (!base || /^(image|img|photo|pxl|dsc|screenshot)\b/i.test(base) || /^\d+$/.test(base)) return ''
  return base.charAt(0).toUpperCase() + base.slice(1)
}
