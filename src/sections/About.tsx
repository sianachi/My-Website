import { Html } from "@/components/Html";
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
      <PageBand kind="head" cells={ABOUT.pageHead} />

      <div className="page-body two-col">
        <div>
          <div className="label label-accent mb-5">{ABOUT.premise.label}</div>
          <Html
            as="h2"
            className="h-display max-w-[14ch]"
            html={ABOUT.premise.heading}
          />
        </div>
        <div className="font-mono text-[13px] leading-[1.75] text-ink-dim max-w-[48ch] [&>p+p]:mt-[1.1em] [&_em]:text-ink [&_em]:italic [&_em]:font-display [&_em]:text-[1.05em]">
          <Html
            as="p"
            className="font-display italic text-[clamp(22px,2.4vw,30px)] leading-[1.35] text-ink max-w-[24ch] mb-7"
            html={ABOUT.bio.lede}
          />
          {ABOUT.bio.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>

      <div className="mt-[clamp(48px,6vw,80px)] grid grid-cols-3 max-[900px]:grid-cols-1 gap-[clamp(27px,3vw,54px)] border-t-[3px] border-rule pt-[clamp(36px,4vw,54px)]">
        {ABOUT.pillars.map((p) => (
          <div key={p.no}>
            <div className="font-mono text-accent text-[10.5px] tracking-[0.22em] mb-[10px]">
              {p.no}
            </div>
            <h4 className="font-display italic font-normal text-[clamp(22px,2vw,28px)] m-0 mb-[10px] text-ink leading-[1.15]">
              {p.heading}
            </h4>
            <Html
              as="p"
              className="font-mono text-[12px] leading-[1.7] text-ink-dim m-0 max-w-[30ch]"
              html={p.body}
            />
          </div>
        ))}
      </div>

      <div className="mt-[clamp(48px,6vw,72px)] grid grid-cols-2 max-[900px]:grid-cols-1 gap-[clamp(27px,3vw,45px)] pt-[clamp(27px,3vw,36px)] border-t-[3px] border-rule">
        {ABOUT.stack.map((s) => (
          <div key={s.label}>
            <div className="label label-accent mb-[10px]">{s.label}</div>
            <Html
              as="p"
              className="font-display text-[clamp(18px,1.5vw,22px)] text-ink leading-[1.4] m-0 max-w-[38ch]"
              html={s.value}
            />
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
