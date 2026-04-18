import type { Palette } from "@/data/schemas";

type Swatch = {
  value: Palette;
  title: string;
  gradient: string;
};

const SWATCHES: Swatch[] = [
  {
    value: "daylight",
    title: "Daylight",
    gradient: "linear-gradient(135deg,#F6F2EB 50%,#7A5A10 50%)",
  },
  {
    value: "midnight",
    title: "Midnight · Gold",
    gradient: "linear-gradient(135deg,#0E0A28 50%,#E8C96A 50%)",
  },
];

type TweaksPanelProps = {
  open: boolean;
  palette: Palette;
  onSelectPalette: (p: Palette) => void;
};

export function TweaksPanel({
  open,
  palette,
  onSelectPalette,
}: TweaksPanelProps) {
  return (
    <aside id="tweaks" aria-label="Tweaks" className={open ? "open" : undefined}>
      <h6>Tweaks</h6>
      <div className="tw-group">
        <span className="tw-label">Palette</span>
        <div className="tw-opts" data-group="palette">
          {SWATCHES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`tw-swatch${palette === s.value ? " active" : ""}`}
              data-value={s.value}
              style={{ background: s.gradient }}
              title={s.title}
              onClick={() => onSelectPalette(s.value)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
