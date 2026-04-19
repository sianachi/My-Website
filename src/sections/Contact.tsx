import { CONTACT_LINKS, COLOPHON_LINES } from "@/data/contact";

type ContactProps = {
  onOpenInteractive: () => void;
};

export function Contact({ onOpenInteractive }: ContactProps) {
  return (
    <section
      id="contact"
      className="page contact contact-page"
      data-label="04 Contact"
    >
      <div className="page-head">
        <div>04 — Contact</div>
        <div>·</div>
        <div>Write, don&apos;t post</div>
      </div>

      <div className="page-body">
        <div
          className="label label-accent"
          style={{ marginBottom: 18 }}
        >
          § 04.1 — Signal
        </div>
        <h2>
          The email is <em>the door</em>.
        </h2>

        <div className="contact-grid">
          <div className="contact-list">
            {CONTACT_LINKS.map((link) => (
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
              § 04.2 — Sign-off
            </div>
            <p className="signoff">
              Thanks for reading this far. If something here resonated, the
              email is the door.
              <span
                className="sig"
                style={{ fontFamily: "var(--font-display)" }}
              >
                — Osi.
              </span>
            </p>

            <div className="colophon">
              {COLOPHON_LINES.map((line) => (
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
                  → Interactive portfolio
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-foot" style={{ marginTop: 48 }}>
        <div>⟲ &nbsp; Return to top</div>
        <div />
        <div>04 / 04</div>
      </div>
    </section>
  );
}
