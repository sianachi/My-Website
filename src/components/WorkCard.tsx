import { useState } from "react";
import type { WorkCardData } from "@/data/schemas";

type WorkCardProps = {
  card: WorkCardData;
};

export function WorkCard({ card }: WorkCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={`work-card${expanded ? " is-expanded" : ""}`}>
      <header className="wc-head">
        <div className="wc-no">{card.no}</div>
        <div className="wc-year">{card.year}</div>
      </header>
      <h3
        className="wc-title"
        dangerouslySetInnerHTML={{ __html: card.title }}
      />
      <p className="wc-lede">{card.lede}</p>
      <button
        type="button"
        className="wc-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="wc-toggle-label" />
        <span className="wc-toggle-glyph" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <line x1={4} y1={10} x2={16} y2={10} />
            <line x1={10} y1={4} x2={10} y2={16} />
          </svg>
        </span>
      </button>
      <dl className="wc-meta">
        {card.meta.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="wc-notes">
        {card.notes.map((n, i) => (
          <p key={i}>{n}</p>
        ))}
      </div>
      <ul className="wc-tags">
        {card.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </article>
  );
}
