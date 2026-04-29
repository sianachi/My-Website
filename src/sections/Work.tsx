import { PageBand } from "@/components/PageBand";
import { WorkCard } from "@/components/WorkCard";
import { useWorkContent } from "@/lib/siteContent";
import { scrollToSection } from "@/lib/scroll";

export function Work() {
  const WORK = useWorkContent();
  return (
    <section
      id="work"
      className="page"
      data-label="03 Work"
    >
      <PageBand
        kind="head"
        cells={WORK.pageHead}
        editable={{ docId: "work", bandKey: "pageHead" }}
      />

      <div className="page-body">
        <div className="grid gap-[clamp(36px,4vw,54px)]">
          {WORK.cards.map((card, i) => (
            <WorkCard key={i} card={card} index={i} />
          ))}
        </div>
      </div>

      <PageBand
        kind="foot"
        cells={WORK.pageFoot}
        editable={{ docId: "work", bandKey: "pageFoot" }}
        style={{ marginTop: 48 }}
        onAction={() => scrollToSection("contact")}
      />
    </section>
  );
}
