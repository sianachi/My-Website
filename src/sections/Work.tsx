import { Html } from "@/components/Html";
import { PageBand } from "@/components/PageBand";
import { WorkCard } from "@/components/WorkCard";
import { WORK } from "@/data/work";

export function Work() {
  return (
    <section
      id="work"
      className="page projects page--plain"
      data-label="03 Work"
    >
      <PageBand kind="head" cells={WORK.pageHead} />

      <div className="page-body">
        <div
          className="label label-accent"
          style={{ marginBottom: 18 }}
        >
          {WORK.introLabel}
        </div>
        <Html
          as="h2"
          style={{ maxWidth: "24ch" }}
          html={WORK.introHeading}
        />

        <div className="work-list">
          {WORK.cards.map((card) => (
            <WorkCard key={card.no} card={card} />
          ))}
        </div>
      </div>

      <PageBand kind="foot" cells={WORK.pageFoot} style={{ marginTop: 48 }} />
    </section>
  );
}
