import { useState } from "react";
import { EditableHtml, EditableText } from "@/components/Editable";
import type { WorkCardData } from "@/shared/data/schemas";

type WorkCardProps = {
  card: WorkCardData;
  index: number;
};

export function WorkCard({ card, index }: WorkCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={`work-card${expanded ? " is-expanded" : ""}`}>
      <header className="wc-head">
        <div className="wc-no">{card.no}</div>
        <EditableText
          as="div"
          className="wc-year"
          docId="work"
          path={["cards", index, "year"]}
          value={card.year}
        />
      </header>
      <EditableHtml
        as="h3"
        className="wc-title"
        docId="work"
        path={["cards", index, "title"]}
        html={card.title}
      />
      <EditableText
        as="p"
        className="wc-lede"
        docId="work"
        path={["cards", index, "lede"]}
        value={card.lede}
      />
      <button
        title="Toggle expnanded view"
        name="toggle"
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
        {card.meta.map((row, mi) => (
          <div key={mi}>
            <EditableText
              as="dt"
              docId="work"
              path={["cards", index, "meta", mi, "label"]}
              value={row.label}
            />
            <EditableText
              as="dd"
              docId="work"
              path={["cards", index, "meta", mi, "value"]}
              value={row.value}
            />
          </div>
        ))}
      </dl>
      <div className="wc-notes">
        {card.notes.map((n, ni) => (
          <EditableText
            as="p"
            key={ni}
            docId="work"
            path={["cards", index, "notes", ni]}
            value={n}
          />
        ))}
      </div>
      <ul className="wc-tags">
        {card.tags.map((tag, ti) => (
          <EditableText
            as="li"
            key={ti}
            docId="work"
            path={["cards", index, "tags", ti]}
            value={tag}
          />
        ))}
      </ul>
    </article>
  );
}
