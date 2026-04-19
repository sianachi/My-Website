import { Html } from "@/components/Html";
import { PageBand } from "@/components/PageBand";
import { useContactContent } from "@/lib/siteContent";
import { scrollToSection } from "@/lib/scroll";

type ContactProps = {
  onOpenInteractive: () => void;
};

export function Contact({ onOpenInteractive }: ContactProps) {
  const CONTACT = useContactContent();
  return (
    <section
      id="contact"
      className="page contact contact-page"
      data-label="04 Contact"
    >
      <PageBand kind="head" cells={CONTACT.pageHead} />

      <div className="page-body">
        <div
          className="label label-accent"
          style={{ marginBottom: 18 }}
        >
          {CONTACT.signalLabel}
        </div>
        <Html as="h2" html={CONTACT.heading} />

        <div className="contact-grid">
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
            <div
              className="label label-accent"
              style={{ marginBottom: 18 }}
            >
              {CONTACT.signoffLabel}
            </div>
            <p className="signoff">
              {CONTACT.signoff}
              <span
                className="sig"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {CONTACT.sig}
              </span>
            </p>

            <div className="colophon">
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
