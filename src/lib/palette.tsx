"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Palette } from "@/shared/data/schemas";

const STORAGE_KEY = "palette";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type PaletteContextValue = {
  palette: Palette;
  setPalette: (next: Palette) => void;
  previewPalette: (next: Palette) => void;
  commitPalette: () => void;
  toggle: () => void;
  hasStoredPreference: boolean;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

/**
 * Persist the choice to BOTH localStorage and a cookie. The cookie is what
 * the server layout reads to render the correct `data-palette` with no flash.
 */
function persist(next: Palette): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage disabled — cookie still carries the preference
  }
  try {
    document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // ignore
  }
}

type PaletteProviderProps = {
  /** Palette resolved server-side from the cookie. */
  initialPalette: Palette;
  /** Whether the cookie was present (drives the first-visit intro). */
  initialHasStored: boolean;
  children: ReactNode;
};

export function PaletteProvider({
  initialPalette,
  initialHasStored,
  children,
}: PaletteProviderProps) {
  const [{ palette, hasStoredPreference }, setState] = useState({
    palette: initialPalette,
    hasStoredPreference: initialHasStored,
  });

  useEffect(() => {
    document.body.dataset.palette = palette;
  }, [palette]);

  const previewPalette = useCallback((next: Palette) => {
    setState((prev) => ({
      palette: next,
      hasStoredPreference: prev.hasStoredPreference,
    }));
  }, []);

  const setPalette = useCallback((next: Palette) => {
    persist(next);
    setState({ palette: next, hasStoredPreference: true });
  }, []);

  const commitPalette = useCallback(() => {
    setState((prev) => {
      persist(prev.palette);
      return { palette: prev.palette, hasStoredPreference: true };
    });
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      const next: Palette =
        prev.palette === "daylight" ? "midnight" : "daylight";
      persist(next);
      return { palette: next, hasStoredPreference: true };
    });
  }, []);

  const value = useMemo<PaletteContextValue>(
    () => ({
      palette,
      setPalette,
      previewPalette,
      commitPalette,
      toggle,
      hasStoredPreference,
    }),
    [palette, setPalette, previewPalette, commitPalette, toggle, hasStoredPreference],
  );

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error("usePalette must be used within <PaletteProvider>");
  }
  return ctx;
}
