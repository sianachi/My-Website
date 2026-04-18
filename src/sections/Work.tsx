import { WorkCard } from "@/components/WorkCard";
import { WORK_CARDS } from "@/data/work";

export function Work() {
  return (
    <section
      id="work"
      className="page projects page--plain"
      data-label="03 Work"
    >
      <div className="page-head">
        <div>03 — Selected Work</div>
        <div>·</div>
        <div>2022 — present</div>
      </div>

      <div className="page-body">
        <div
          className="label label-accent"
          style={{ marginBottom: 18 }}
        >
          § 03.1 — Five projects, told long
        </div>
        <h2 style={{ maxWidth: "24ch" }}>
          Work that <em>carries</em> weight.
        </h2>

        <div className="work-list">
          {WORK_CARDS.map((card) => (
            <WorkCard key={card.no} card={card} />
          ))}
        </div>
      </div>

      <div className="page-foot" style={{ marginTop: 48 }}>
        <div>↓ &nbsp; Contact</div>
        <div />
        <div>03 / 04</div>
      </div>
    </section>
  );
}
