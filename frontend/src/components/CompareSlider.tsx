import { useState } from 'react'

interface Props {
  before: string
  after: string
  alt: string
}

/** Drag the handle to wipe between the original selfie and the try-on result. */
export function CompareSlider({ before, after, alt }: Props) {
  const [pos, setPos] = useState(50)

  return (
    <div className="compare" style={{ ['--pos' as string]: `${pos}%` }}>
      <img className="compare-img" src={after} alt={alt} draggable={false} />
      <img className="compare-img compare-before" src={before} alt="" aria-hidden draggable={false} />
      <div className="compare-handle" aria-hidden>
        <span>‹ ›</span>
      </div>
      <span className="compare-tag compare-tag-left">Before</span>
      <span className="compare-tag compare-tag-right">After</span>
      <input
        className="compare-range"
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
      />
    </div>
  )
}
