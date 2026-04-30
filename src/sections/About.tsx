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

      <div className="page-body py-[clamp(18px,3vw,36px)]!">
        <EditableHtml
          as="h2"
          className="h-display max-w-[30ch] text-[clamp(26px,3.4vw,44px)]! mb-6!"
          docId="about"
          path={["bio", "lede"]}
          html={ABOUT.bio.lede}
        />
        <div className="font-mono text-[12.5px] leading-[1.65] text-ink-dim max-w-[60ch] [&>p+p]:mt-[0.9em] [&_em]:text-ink [&_em]:italic [&_em]:font-display [&_em]:text-[1.05em]">
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

      <div className="mt-[clamp(24px,3vw,36px)] pt-[clamp(18px,2vw,27px)] border-t-[3px] border-rule grid grid-cols-2 max-[900px]:grid-cols-1 gap-[clamp(36px,5vw,72px)]">
        <div className="min-w-0">
          <p className="font-mono text-accent text-[10.5px] tracking-[0.22em] mb-3">
            Education
          </p>
          <div className="grid gap-3">
            {ABOUT.education.map((s, i) => (
              <EditableHtml
                key={i}
                as="p"
                className="font-display text-[clamp(15px,1.2vw,18px)] text-ink leading-[1.35] m-0 break-words"
                docId="about"
                path={["education", i, "value"]}
                html={s.value}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-accent text-[10.5px] tracking-[0.22em] mb-3">
            Skills
          </p>
          <div className="grid gap-3">
            {ABOUT.skills.map((s, i) => (
              <EditableHtml
                key={i}
                as="p"
                className="font-display text-[clamp(15px,1.2vw,18px)] text-ink leading-[1.35] m-0 break-words"
                docId="about"
                path={["skills", i, "value"]}
                html={s.value}
              />
            ))}
          </div>
        </div>
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
