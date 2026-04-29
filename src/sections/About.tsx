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

      <div className="page-body">
        <EditableHtml
          as="h2"
          className="h-display max-w-[24ch]"
          docId="about"
          path={["bio", "lede"]}
          html={ABOUT.bio.lede}
        />
        <div className="font-mono text-[13px] leading-[1.75] text-ink-dim max-w-[60ch] [&>p+p]:mt-[1.1em] [&_em]:text-ink [&_em]:italic [&_em]:font-display [&_em]:text-[1.05em]">
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
