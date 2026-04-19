import { Html } from "@/components/Html";
import { PageBand } from "@/components/PageBand";
import { useAboutContent } from "@/lib/siteContent";
import { scrollToSection } from "@/lib/scroll";

export function About() {
  const ABOUT = useAboutContent();
  return (
    <section
      id="about"
      className="page bio page--plain"
      data-label="02 About"
    >
      <PageBand kind="head" cells={ABOUT.pageHead} />

      <div className="page-body two-col">
        <div>
          <div
            className="label label-accent"
            style={{ marginBottom: 20 }}
          >
            {ABOUT.premise.label}
          </div>
          <Html as="h2" html={ABOUT.premise.heading} />
        </div>
        <div className="bio-body">
          <Html
            as="p"
            className="bio-lede"
            style={{ marginBottom: 28 }}
            html={ABOUT.bio.lede}
          />
          {ABOUT.bio.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>

      <div className="pillars">
        {ABOUT.pillars.map((p) => (
          <div key={p.no} className="pillar">
            <div className="no">{p.no}</div>
            <h4>{p.heading}</h4>
            <Html as="p" html={p.body} />
          </div>
        ))}
      </div>

      <div className="stack-grid">
        {ABOUT.stack.map((s) => (
          <div key={s.label}>
            <div className="label label-accent">{s.label}</div>
            <Html as="p" className="stack-line" html={s.value} />
          </div>
        ))}
      </div>

      <PageBand
        kind="foot"
        cells={ABOUT.pageFoot}
        style={{ marginTop: 48 }}
        onAction={() => scrollToSection("work")}
      />
    </section>
  );
}
