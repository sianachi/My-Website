import { Html } from "@/components/Html";
import { PageBand } from "@/components/PageBand";
import { useContactContent } from "@/lib/siteContent";
import { scrollToSection } from "@/lib/scroll";

export function Contact({ onOpenInteractive }: { onOpenInteractive: () => void }) {
  const CONTACT = useContactContent();
  return (
    <section
      id="contact"
      className="page contact-page border-b-[3px] border-rule"
      data-label="04 Contact"
    >
      <PageBand kind="head" cells={CONTACT.pageHead} />

      <div className="page-body">
        <div className="label label-accent mb-4.5">{CONTACT.signalLabel}</div>
        <Html
          as="h2"
          className="h-display max-w-[16ch]"
          html={CONTACT.heading}
        />

        <div className="mt-[clamp(40px,5vw,64px)] grid grid-cols-[1.2fr_1fr] max-[900px]:grid-cols-1 gap-[clamp(36px,5vw,72px)] pt-9 border-t-[3px] border-rule">
          <div className="contact-list">
            {CONTACT.links.map((link) => (
              <a
                key={link.label}
                className="contact-item"
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <div className="ci-label">{link.label}</div>
                <div className="ci-value">{link.value}</div>
                <div className="ci-go">{link.cta}</div>
              </a>
            ))}
          </div>

          <div>
            <div className="label label-accent mb-4.5">{CONTACT.signoffLabel}</div>
            <p className="font-display italic text-[clamp(22px,2vw,26px)] leading-[1.4] text-ink max-w-[24ch]">
              {CONTACT.signoff}
              <span className="block mt-7 font-display text-[clamp(36px,4vw,56px)] text-accent leading-[0.9]">
                {CONTACT.sig}
              </span>
            </p>

            <div className="mt-10 font-mono text-[10.5px] max-[900px]:text-[10px] tracking-[0.2em] max-[900px]:tracking-[0.18em] uppercase text-ink-faint leading-[1.9] pt-6.75 border-t-[3px] border-rule">
              {CONTACT.colophon.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div className="ip-link-wrap">
                <a
                  href="/interactive"
                  className="colophon-interactive"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenInteractive();
                  }}
                >
                  {CONTACT.interactiveLinkLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageBand
        kind="foot"
        cells={CONTACT.pageFoot}
        style={{ marginTop: 48 }}
        onAction={() => scrollToSection("cover")}
      />
    </section>
  );
}
