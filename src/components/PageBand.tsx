import type { CSSProperties } from "react";
import type { PageBand as PageBandTuple } from "@/shared/data/schemas";

type PageBandProps = {
  kind: "head" | "foot";
  cells: PageBandTuple;
  style?: CSSProperties;
};

export function PageBand({ kind, cells, style }: PageBandProps) {
  const className = kind === "head" ? "page-head" : "page-foot";
  return (
    <div className={className} style={style}>
      <div>{cells[0]}</div>
      <div>{cells[1]}</div>
      <div>{cells[2]}</div>
    </div>
  );
}
