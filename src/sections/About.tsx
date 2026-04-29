import { EditableHtml, EditableText } from "@/components/Editable";
import { PageBand } from "@/components/PageBand";
import { useAboutContent } from "@/lib/siteContent";
import { scrollToSection } from "@/lib/scroll";

export function About() {
  const ABOUT = useAboutContent();
  return (
    <section
      id="about"
      className="page"
      data-label="02 About"
    >
      <PageBand
        kind="head"
        cells={ABOUT.pageHead}
        editable={{ docId: "about", bandKey: "pageHead" }}
      />

      <div className="page-body two-col">
        <div>
          <EditableHtml
            as="h2"
            className="h-display max-w-[14ch]"
            docId="about"
            path={["premise", "heading"]}
            html={ABOUT.premise.heading}
          />
        </div>
        <div className="font-mono text-[13px] leading-[1.75] text-ink-dim max-w-[48ch] [&>p+p]:mt-[1.1em] [&_em]:text-ink [&_em]:italic [&_em]:font-display [&_em]:text-[1.05em]">
          <EditableHtml
            as="p"
            className="font-display italic text-[clamp(22px,2.4vw,30px)] leading-[1.35] text-ink max-w-[24ch] mb-7"
            docId="about"
            path={["bio", "lede"]}
            html={ABOUT.bio.lede}
          />
          {ABOUT.bio.paragraphs.map((p, i) => (
            <EditableText
              as="p"
              key={i}
              docId="about"
              path={["bio", "paragraphs", i]}
              value={p}
            />
          ))}
        </div>
      </div>

      <div className="mt-[clamp(48px,6vw,80px)] grid grid-cols-3 max-[900px]:grid-cols-1 gap-[clamp(27px,3vw,54px)] border-t-[3px] border-rule pt-[clamp(36px,4vw,54px)]">
        {ABOUT.pillars.map((p, i) => (
          <div key={i}>
            <div className="font-mono text-accent text-[10.5px] tracking-[0.22em] mb-2.5">
              {p.no}
            </div>
            <EditableText
              as="h4"
              className="font-display italic font-normal text-[clamp(22px,2vw,28px)] m-0 mb-2.5 text-ink leading-[1.15]"
              docId="about"
              path={["pillars", i, "heading"]}
              value={p.heading}
            />
            <EditableHtml
              as="p"
              className="font-mono text-[12px] leading-[1.7] text-ink-dim m-0 max-w-[30ch]"
              docId="about"
              path={["pillars", i, "body"]}
              html={p.body}
            />
          </div>
        ))}
      </div>

      <div className="mt-[clamp(48px,6vw,72px)] grid grid-cols-2 max-[900px]:grid-cols-1 gap-[clamp(27px,3vw,45px)] pt-[clamp(27px,3vw,36px)] border-t-[3px] border-rule">
        {ABOUT.stack.map((s, i) => (
          <div key={i}>
            <EditableHtml
              as="p"
              className="font-display text-[clamp(18px,1.5vw,22px)] text-ink leading-[1.4] m-0 max-w-[38ch]"
              docId="about"
              path={["stack", i, "value"]}
              html={s.value}
            />
          </div>
        ))}
      </div>

      <PageBand
        kind="foot"
        cells={ABOUT.pageFoot}
        editable={{ docId: "about", bandKey: "pageFoot" }}
        style={{ marginTop: 48 }}
        onAction={() => scrollToSection("work")}
      />
    </section>
  );
}
