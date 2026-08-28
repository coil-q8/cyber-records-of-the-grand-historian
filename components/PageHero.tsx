import { Link } from 'react-router-dom'

export function PageHero({ eyebrow, title, description, meta, back }: { eyebrow: string; title: string; description: string; meta?: React.ReactNode; back?: { label: string; to: string } }) {
  return (
    <section className="page-hero archive-grid">
      <div className="page-shell">
        {back && <Link className="back-link" to={back.to}>← {back.label}</Link>}
        <span className="eyebrow">{eyebrow}</span>
        <div className="page-hero__row"><h1>{title}</h1>{meta && <div className="page-hero__meta">{meta}</div>}</div>
        <p>{description}</p>
      </div>
    </section>
  )
}
