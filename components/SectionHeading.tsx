export function SectionHeading({ eyebrow, title, description, aside }: { eyebrow?: string; title: string; description?: string; aside?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {aside && <div className="section-heading__aside">{aside}</div>}
    </div>
  )
}
