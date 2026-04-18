import { MobileMenu } from "@/components/MobileMenu";
import { Nav } from "@/components/Nav";
import { PageDivider, DIVIDERS } from "@/components/PageDivider";
import { PaletteIntro } from "@/components/PaletteIntro";
import { TweaksPanel } from "@/components/TweaksPanel";
import { NAV_ENTRIES } from "@/data/nav";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import { usePalette } from "@/hooks/usePalette";
import { useSmoothAnchor } from "@/hooks/useSmoothAnchor";
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
  const menu = useMobileMenu();
  const sectionIds = useMemo(() => NAV_ENTRIES.map((e) => e.id), []);
  const activeId = useActiveSection(sectionIds);

  useSmoothAnchor();

  return (
    <>
      {!hasStoredPreference && (
        <PaletteIntro
          selected={palette}
          onPreview={previewPalette}
          onContinue={commitPalette}
        />
      )}

      <Nav
        activeId={activeId}
        menuOpen={menu.isOpen}
        onMenuToggle={menu.toggle}
        onThemeToggle={toggleTheme}
      />
      <MobileMenu isOpen={menu.isOpen} onClose={menu.close} />

      <Cover />
      <PageDivider {...DIVIDERS.cover} />
      <About />
      <PageDivider {...DIVIDERS.about} />
      <Work />
      <PageDivider {...DIVIDERS.work} />
      <Contact />

      <TweaksPanel
        open={false}
        palette={palette}
        onSelectPalette={setPalette}
      />
    </>
  );
}
