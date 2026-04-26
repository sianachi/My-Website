import { Html } from "@/components/Html";
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
      <PageBand kind="head" cells={WORK.pageHead} />

      <div className="page-body">
        <div className="label label-accent mb-[18px]">{WORK.introLabel}</div>
        <Html
          as="h2"
          className="h-display max-w-[24ch]"
          html={WORK.introHeading}
        />

        <div className="mt-[clamp(32px,4vw,56px)] grid gap-[clamp(36px,4vw,54px)]">
          {WORK.cards.map((card) => (
            <WorkCard key={card.no} card={card} />
          ))}
        </div>
      </div>

      <PageBand
        kind="foot"
        cells={WORK.pageFoot}
        style={{ marginTop: 48 }}
        onAction={() => scrollToSection("contact")}
      />
    </section>
  );
}
