import { EditableHtml, EditableText } from "@/components/Editable";
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
      <PageBand
        kind="head"
        cells={CONTACT.pageHead}
        editable={{ docId: "contact", bandKey: "pageHead" }}
      />

      <div className="page-body">
        <EditableText
          as="div"
          className="label label-accent mb-4.5"
          docId="contact"
          path={["signalLabel"]}
          value={CONTACT.signalLabel}
        />
        <EditableHtml
          as="h2"
          className="h-display max-w-[16ch]"
          docId="contact"
          path={["heading"]}
          html={CONTACT.heading}
        />

        <div className="mt-[clamp(40px,5vw,64px)] grid grid-cols-[1.2fr_1fr] max-[900px]:grid-cols-1 gap-[clamp(36px,5vw,72px)] pt-9 border-t-[3px] border-rule">
          <div className="contact-list">
            {CONTACT.links.map((link, i) => (
              <a
                key={i}
                className="contact-item"
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <EditableText
                  as="div"
                  className="ci-label"
                  docId="contact"
                  path={["links", i, "label"]}
                  value={link.label}
                />
                <EditableText
                  as="div"
                  className="ci-value"
                  docId="contact"
                  path={["links", i, "value"]}
                  value={link.value}
                />
                <EditableText
                  as="div"
                  className="ci-go"
                  docId="contact"
                  path={["links", i, "cta"]}
                  value={link.cta}
                />
              </a>
            ))}
          </div>

          <div>
            <EditableText
              as="div"
              className="label label-accent mb-4.5"
              docId="contact"
              path={["signoffLabel"]}
              value={CONTACT.signoffLabel}
            />
            <p className="font-display italic text-[clamp(22px,2vw,26px)] leading-[1.4] text-ink max-w-[24ch]">
              <EditableText
                docId="contact"
                path={["signoff"]}
                value={CONTACT.signoff}
              />
              <EditableText
                as="span"
                className="block mt-7 font-display text-[clamp(36px,4vw,56px)] text-accent leading-[0.9]"
                docId="contact"
                path={["sig"]}
                value={CONTACT.sig}
              />
            </p>

            <div className="mt-10 font-mono text-[10.5px] max-[900px]:text-[10px] tracking-[0.2em] max-[900px]:tracking-[0.18em] uppercase text-ink-faint leading-[1.9] pt-6.75 border-t-[3px] border-rule">
              {CONTACT.colophon.map((line, i) => (
                <EditableText
                  as="div"
                  key={i}
                  docId="contact"
                  path={["colophon", i]}
                  value={line}
                />
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
                  <EditableText
                    docId="contact"
                    path={["interactiveLinkLabel"]}
                    value={CONTACT.interactiveLinkLabel}
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageBand
        kind="foot"
        cells={CONTACT.pageFoot}
        editable={{ docId: "contact", bandKey: "pageFoot" }}
        style={{ marginTop: 48 }}
        onAction={() => scrollToSection("cover")}
      />
    </section>
  );
}
