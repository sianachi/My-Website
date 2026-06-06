import { ThemeToggle } from "@/components/ThemeToggle";

type InteractivePortfolioProps = {
  onBack: () => void;
  onThemeToggle: () => void;
};

const IFRAME_SRC = "https://osi-mario.netlify.app/";

export function InteractivePortfolio({
  onBack,
  onThemeToggle,
}: InteractivePortfolioProps) {
  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onBack();
  };

  return (
    <div className="ip-page">
      <header className="ip-nav" aria-label="Interactive portfolio navigation">
        <a href="/" className="nav-mark" onClick={handleBack}>
          Osinachi · 2026
        </a>
        <div className="ip-nav-title">
          <span className="ip-nav-mark">§</span>
          <span>Interactive Portfolio</span>
        </div>
        <div className="ip-nav-right">
          <a href="/" className="ip-back" onClick={handleBack}>
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </a>
          <ThemeToggle onToggle={onThemeToggle} />
        </div>
      </header>

      <main className="ip-body">
        <div className="ip-frame-wrap">
          <iframe
            className="ip-frame"
            src={IFRAME_SRC}
            title="Osinachi — interactive portfolio"
            loading="lazy"
            allow="fullscreen; gamepad; autoplay"
            allowFullScreen
          />
        </div>

        <div className="ip-mobile-fallback">
          <div className="label label-accent" style={{ marginBottom: 16 }}>
            § Desktop only
          </div>
          <h2 className="ip-fallback-title">
            Best on a <em>bigger screen</em>.
          </h2>
          <p className="ip-fallback-lede">
            The interactive portfolio is keyboard-driven and won&apos;t play
            well on a phone. Come back on a desktop.
          </p>
          <a href="/" onClick={handleBack} className="ip-fallback-back">
            ← Return to the site
          </a>
        </div>
      </main>
    </div>
  );
}
