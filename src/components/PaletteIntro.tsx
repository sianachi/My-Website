import { useEffect } from "react";
import type { Palette } from "@/data/schemas";

type PaletteIntroProps = {
  selected: Palette;
  onPreview: (palette: Palette) => void;
  onContinue: () => void;
};

export function PaletteIntro({
  selected,
  onPreview,
  onContinue,
}: PaletteIntroProps) {
  useEffect(() => {
    document.body.classList.add("intro-open");
    return () => {
      document.body.classList.remove("intro-open");
    };
  }, []);

  return (
    <div
      className="palette-intro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="palette-intro-title"
    >
      <div className="pi-backdrop" aria-hidden="true" />
      <div className="pi-panel">
        <div className="pi-eyebrow label-accent">§ Welcome · Portfolio 2026</div>
        <h2 id="palette-intro-title" className="pi-title">
          Choose your <em>experience</em>.
        </h2>
        <p className="pi-lede">
          Pick a palette. You can switch anytime after.
        </p>

        <div className="pi-choices" role="radiogroup" aria-label="Palette">
          <button
            type="button"
            role="radio"
            aria-checked={selected === "daylight"}
            className={`pi-choice pi-choice--day${
              selected === "daylight" ? " is-selected" : ""
            }`}
            onClick={() => onPreview("daylight")}
          >
            <span className="pi-glyph pi-sun" aria-hidden="true">
              <span className="pi-sun-orb" />
              <span className="pi-sun-rays">
                {Array.from({ length: 8 }).map((_, i) => (
                  <i key={i} />
                ))}
              </span>
            </span>
            <span className="pi-choice-label">
              <span className="pi-choice-name">Light</span>
              <span className="pi-choice-sub">Daylight · Warm paper</span>
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={selected === "midnight"}
            className={`pi-choice pi-choice--night${
              selected === "midnight" ? " is-selected" : ""
            }`}
            onClick={() => onPreview("midnight")}
          >
            <span className="pi-glyph pi-moon" aria-hidden="true">
              <span className="pi-moon-orb" />
            </span>
            <span className="pi-choice-label">
              <span className="pi-choice-name">Dark</span>
              <span className="pi-choice-sub">Midnight · Gold, lilac</span>
            </span>
          </button>
        </div>

        <div className="pi-actions">
          <button type="button" className="pi-continue" onClick={onContinue}>
            Continue
            <span aria-hidden="true" className="pi-continue-arrow">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
