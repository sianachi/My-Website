import { Fragment } from "react";
import { EditableHtml, EditableText } from "@/components/Editable";
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
      className="page cover"
      data-label="01 Home"
    >
      <Stars />
      <Orbits />

      <PageBand
        kind="head"
        cells={COVER.pageHead}
        editable={{ docId: "cover", bandKey: "pageHead" }}
      />

      <div className="page-body max-w-215 pt-[clamp(60px,10vh,120px)] max-[900px]:pt-[clamp(20px,4vh,48px)]">
        <div className="flex items-center gap-3.5 max-[900px]:flex-wrap max-[900px]:gap-y-2 text-accent text-[13px] mb-[clamp(28px,4vw,48px)]">
          <span className="opacity-50 mr-1">‹</span>
          {COVER.eyebrow.map((chip, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span className="w-1 h-1 rounded-full bg-accent opacity-70" />
              )}
              <EditableText
                docId="cover"
                path={["eyebrow", i]}
                value={chip}
              />
            </Fragment>
          ))}
        </div>

        <h1 className="display m-0 text-[clamp(64px,12vw,172px)] max-[900px]:text-[clamp(52px,13vw,88px)]">
          <span className="block text-accent">
            <EditableText
              as="em"
              docId="cover"
              path={["nameGivenEmphasis"]}
              value={COVER.nameGivenEmphasis}
            />
            <EditableText
              docId="cover"
              path={["nameGivenRest"]}
              value={COVER.nameGivenRest}
            />
          </span>
          <EditableText
            as="span"
            className="block text-accent ml-[clamp(10px,2vw,40px)] max-[900px]:ml-0 -mt-[0.05em]"
            docId="cover"
            path={["nameFamily"]}
            value={COVER.nameFamily}
          />
        </h1>

        <div className="mt-[clamp(36px,5vw,56px)] grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)] max-[900px]:grid-cols-1 gap-[clamp(24px,4vw,64px)] items-baseline max-w-180">
          <EditableHtml
            as="p"
            className="lede max-w-[42ch] [&_em]:italic [&_em]:text-accent [&_em]:font-medium"
            docId="cover"
            path={["lede"]}
            html={COVER.lede}
          />
          <div className="grid gap-1 font-mono text-[10.5px] tracking-[0.22em] uppercase text-accent-2 leading-[1.9] border-l-[3px] border-rule pl-4.5">
            {COVER.stack.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[3em_1fr] items-baseline gap-3"
              >
                <span className="text-ink-faint">{row.tab}</span>
                <EditableHtml
                  docId="cover"
                  path={["stack", i, "value"]}
                  html={row.value}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageBand
        kind="foot"
        cells={COVER.pageFoot}
        editable={{ docId: "cover", bandKey: "pageFoot" }}
        onAction={() => scrollToSection("about")}
      />
    </section>
  );
}
