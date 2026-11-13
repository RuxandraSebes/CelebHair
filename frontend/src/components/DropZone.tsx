import { useRef, useState, type ReactNode } from 'react'
import { imageFiles } from '../images'

interface Props {
  multiple?: boolean
  onFiles: (files: File[]) => void
  className?: string
  children: ReactNode
  label: string
}

export function DropZone({ multiple = false, onFiles, className = '', children, label }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`dropzone ${over ? 'is-over' : ''} ${className}`}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          input.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const files = imageFiles(e.dataTransfer.files)
        if (files.length) onFiles(multiple ? files : files.slice(0, 1))
      }}
    >
      {children}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = imageFiles(e.target.files)
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
