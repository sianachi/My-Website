"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MobileMenu } from "@/components/MobileMenu";
import { Nav, NAV_ENTRIES } from "@/components/Nav";
import { PageDivider, DIVIDERS } from "@/components/PageDivider";
import { PaletteIntro } from "@/components/PaletteIntro";
import { TweaksPanel } from "@/components/TweaksPanel";
import { EditStatusBar } from "@/components/EditStatusBar";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import { usePalette } from "@/hooks/usePalette";
import { useSmoothAnchor } from "@/hooks/useSmoothAnchor";
import { SiteContentProvider } from "@/lib/siteContent";
import { AdminAwareProvider } from "@/lib/adminAware";
import { About } from "@/sections/About";
import { Contact } from "@/sections/Contact";
import { Cover } from "@/sections/Cover";
import { Work } from "@/sections/Work";
import type { SiteContent } from "@/lib/api";

/**
 * The home page is a client island: the server component (`app/page.tsx`)
 * fetches content and hands it in as `initialContent`, so the page renders
 * fully on the server (SSR) and hydrates without a client-side fetch.
 */
export function HomeClient({
  initialContent,
}: {
  initialContent: SiteContent;
}) {
  return (
    <AdminAwareProvider>
      <SiteContentProvider initial={initialContent}>
        <Home />
        <EditStatusBar />
      </SiteContentProvider>
    </AdminAwareProvider>
  );
}

function Home() {
  const {
    palette,
    toggle: toggleTheme,
    setPalette,
    previewPalette,
    commitPalette,
    hasStoredPreference,
  } = usePalette();
  const router = useRouter();
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
      <Contact onOpenInteractive={() => router.push("/interactive")} />

      <TweaksPanel open={false} palette={palette} onSelectPalette={setPalette} />
    </>
  );
}
