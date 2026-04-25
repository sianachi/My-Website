import { Analytics } from "@vercel/analytics/react";
import { MobileMenu } from "@/components/MobileMenu";
import { Nav, NAV_ENTRIES } from "@/components/Nav";
import { PageDivider, DIVIDERS } from "@/components/PageDivider";
import { PaletteIntro } from "@/components/PaletteIntro";
import { TweaksPanel } from "@/components/TweaksPanel";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import { usePalette } from "@/hooks/usePalette";
import { useRoute } from "@/hooks/useRoute";
import { useSiteContentFetch } from "@/hooks/useSiteContent";
import { useSmoothAnchor } from "@/hooks/useSmoothAnchor";
import { SiteContentProvider } from "@/lib/siteContent";
import { AdminPage } from "@/pages/AdminPage";
import { InteractivePortfolio } from "@/pages/InteractivePortfolio";
import { About } from "@/sections/About";
import { Contact } from "@/sections/Contact";
import { Cover } from "@/sections/Cover";
import { Work } from "@/sections/Work";
import { useMemo } from "react";

export function App() {
  const {
    palette,
    toggle: toggleTheme,
    setPalette,
    previewPalette,
    commitPalette,
    hasStoredPreference,
  } = usePalette();
  const route = useRoute();
  const { status, retry } = useSiteContentFetch();

  const inIframe =
    typeof window !== "undefined" && window.self !== window.top;

  return (
    <>
      {renderRoute()}
      {!inIframe && <Analytics />}
    </>
  );

  function renderRoute() {
    if (route.path === "/core" || route.path.startsWith("/core/")) {
      return <AdminPage path={route.path} navigate={route.navigate} />;
    }

    if (route.path === "/interactive") {
      return (
        <InteractivePortfolio
          onBack={() => route.navigate("/")}
          onThemeToggle={toggleTheme}
        />
      );
    }

    if (status.state === "loading") {
      return <Splash />;
    }

    if (status.state === "error") {
      return <ErrorScreen message={status.error.message} onRetry={retry} />;
    }

    return (
      <SiteContentProvider value={status.content}>
        <Home
          palette={palette}
          hasStoredPreference={hasStoredPreference}
          onThemeToggle={toggleTheme}
          onSelectPalette={setPalette}
          onPreviewPalette={previewPalette}
          onCommitPalette={commitPalette}
          onOpenInteractive={() => route.navigate("/interactive")}
        />
      </SiteContentProvider>
    );
  }
}

type HomeProps = {
  palette: ReturnType<typeof usePalette>["palette"];
  hasStoredPreference: boolean;
  onThemeToggle: () => void;
  onSelectPalette: ReturnType<typeof usePalette>["setPalette"];
  onPreviewPalette: ReturnType<typeof usePalette>["previewPalette"];
  onCommitPalette: ReturnType<typeof usePalette>["commitPalette"];
  onOpenInteractive: () => void;
};

function Home({
  palette,
  hasStoredPreference,
  onThemeToggle,
  onSelectPalette,
  onPreviewPalette,
  onCommitPalette,
  onOpenInteractive,
}: HomeProps) {
  const menu = useMobileMenu();
  const sectionIds = useMemo(() => NAV_ENTRIES.map((e) => e.id), []);
  const activeId = useActiveSection(sectionIds);

  useSmoothAnchor();

  return (
    <>
      {!hasStoredPreference && (
        <PaletteIntro
          selected={palette}
          onPreview={onPreviewPalette}
          onContinue={onCommitPalette}
        />
      )}

      <Nav
        activeId={activeId}
        menuOpen={menu.isOpen}
        onMenuToggle={menu.toggle}
        onThemeToggle={onThemeToggle}
      />
      <MobileMenu isOpen={menu.isOpen} onClose={menu.close} />

      <Cover />
      <PageDivider {...DIVIDERS.cover} />
      <About />
      <PageDivider {...DIVIDERS.about} />
      <Work />
      <PageDivider {...DIVIDERS.work} />
      <Contact onOpenInteractive={onOpenInteractive} />

      <TweaksPanel
        open={false}
        palette={palette}
        onSelectPalette={onSelectPalette}
      />
    </>
  );
}

function Splash() {
  return (
    <div className="site-splash" aria-busy="true" aria-live="polite">
      <span className="site-splash-dot" />
    </div>
  );
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="site-error" role="alert">
      <div className="label label-accent">§ Couldn&apos;t load content</div>
      <p className="site-error-msg">{message}</p>
      <button type="button" className="site-error-retry" onClick={onRetry}>
        Retry →
      </button>
    </div>
  );
}
