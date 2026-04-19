import type { CSSProperties } from "react";
import type { PageBand as PageBandTuple } from "@/shared/data/schemas";

type PageBandProps = {
  kind: "head" | "foot";
  cells: PageBandTuple;
  style?: CSSProperties;
  /**
   * When provided, the first cell becomes a <button> that invokes this
   * handler — used for "↓ About" / "⟲ Return to top" style affordances.
   */
  onAction?: () => void;
};

export function PageBand({ kind, cells, style, onAction }: PageBandProps) {
  const className = kind === "head" ? "page-head" : "page-foot";
  return (
    <div className={className} style={style}>
      <div>
        {onAction ? (
          <button
            type="button"
            className="page-band-action"
            onClick={onAction}
          >
            {cells[0]}
          </button>
        ) : (
          cells[0]
        )}
      </div>
      <div>{cells[1]}</div>
      <div>{cells[2]}</div>
    </div>
  );
}
