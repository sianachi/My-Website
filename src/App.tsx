import { MobileMenu } from "@/components/MobileMenu";
import { Nav } from "@/components/Nav";
import { PageDivider, DIVIDERS } from "@/components/PageDivider";
import { PaletteIntro } from "@/components/PaletteIntro";
import { TweaksPanel } from "@/components/TweaksPanel";
import { NAV_ENTRIES } from "@/data/nav";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import { usePalette } from "@/hooks/usePalette";
import { useRoute } from "@/hooks/useRoute";
import { useSmoothAnchor } from "@/hooks/useSmoothAnchor";
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

  if (route.path === "/interactive") {
    return (
      <InteractivePortfolio
        onBack={() => route.navigate("/")}
        onThemeToggle={toggleTheme}
      />
    );
  }

  return (
    <Home
      palette={palette}
      hasStoredPreference={hasStoredPreference}
      onThemeToggle={toggleTheme}
      onSelectPalette={setPalette}
      onPreviewPalette={previewPalette}
      onCommitPalette={commitPalette}
      onOpenInteractive={() => route.navigate("/interactive")}
    />
  );
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
