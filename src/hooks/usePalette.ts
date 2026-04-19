import { useCallback, useEffect, useState } from "react";
import { PaletteSchema, type Palette } from "@/shared/data/schemas";

const STORAGE_KEY = "palette";
const DEFAULT_PALETTE: Palette = "midnight";

type InitialState = {
  palette: Palette;
  hasStoredPreference: boolean;
};

function readInitial(): InitialState {
  if (typeof document !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedParsed = PaletteSchema.safeParse(saved);
      if (savedParsed.success) {
        return { palette: savedParsed.data, hasStoredPreference: true };
      }
    } catch {
      // localStorage disabled — fall through
    }
    const fromDom = PaletteSchema.safeParse(document.body.dataset.palette);
    if (fromDom.success) {
      return { palette: fromDom.data, hasStoredPreference: false };
    }
  }
  return { palette: DEFAULT_PALETTE, hasStoredPreference: false };
}

function writeStorage(next: Palette) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore — localStorage disabled
  }
}

export function usePalette() {
  const [{ palette, hasStoredPreference }, setState] =
    useState<InitialState>(readInitial);

  useEffect(() => {
    document.body.dataset.palette = palette;
  }, [palette]);

  const previewPalette = useCallback((next: Palette) => {
    setState((prev) => ({ palette: next, hasStoredPreference: prev.hasStoredPreference }));
  }, []);

  const setPalette = useCallback((next: Palette) => {
    writeStorage(next);
    setState({ palette: next, hasStoredPreference: true });
  }, []);

  const commitPalette = useCallback(() => {
    setState((prev) => {
      writeStorage(prev.palette);
      return { palette: prev.palette, hasStoredPreference: true };
    });
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      const next: Palette = prev.palette === "daylight" ? "midnight" : "daylight";
      writeStorage(next);
      return { palette: next, hasStoredPreference: true };
    });
  }, []);

  return {
    palette,
    setPalette,
    previewPalette,
    commitPalette,
    toggle,
    hasStoredPreference,
  };
}
