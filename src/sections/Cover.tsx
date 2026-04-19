import { Fragment } from "react";
import { Html } from "@/components/Html";
import { Orbits } from "@/components/Orbits";
import { PageBand } from "@/components/PageBand";
import { Stars } from "@/components/Stars";
import { useCoverContent } from "@/lib/siteContent";
import { scrollToSection } from "@/lib/scroll";

export function Cover() {
  const COVER = useCoverContent();
  return (
    <section
      id="cover"
      className="page cover page--plain"
      data-label="01 Home"
    >
      <Stars />
      <Orbits />

      <PageBand kind="head" cells={COVER.pageHead} />

      <div className="page-body cover-body">
        <div className="cover-eyebrow label-accent" style={{ fontSize: 13 }}>
          <span className="chev">‹</span>
          {COVER.eyebrow.map((chip, i) => (
            <Fragment key={chip}>
              {i > 0 && <span className="dot" />}
              <span>{chip}</span>
            </Fragment>
          ))}
        </div>

        <h1>
          <span className="given">
            <em>{COVER.nameGivenEmphasis}</em>
            {COVER.nameGivenRest}
          </span>
          <span className="family">{COVER.nameFamily}</span>
        </h1>

        <div className="cover-meta">
          <Html as="p" className="lede" html={COVER.lede} />
          <div className="stack">
            {COVER.stack.map((row) => (
              <div key={row.value}>
                <span className="tab">{row.tab}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageBand
        kind="foot"
        cells={COVER.pageFoot}
        onAction={() => scrollToSection("about")}
      />
    </section>
  );
}
