import type { CSSProperties, ReactNode } from "react";
import type { PageBand as PageBandTuple } from "@/shared/data/schemas";
import { EditableText } from "@/components/Editable";
import type { ContentDocId } from "@/shared/data/schemas";

type PageBandProps = {
  kind: "head" | "foot";
  cells: PageBandTuple;
  style?: CSSProperties;
  /**
   * When provided, the first cell becomes a <button> that invokes this
   * handler — used for "↓ About" / "⟲ Return to top" style affordances.
   */
  onAction?: () => void;
  /** When set, cells become editable for admins, keyed by `<docId>.<bandKey>.<index>`. */
  editable?: { docId: ContentDocId; bandKey: "pageHead" | "pageFoot" };
};

export function PageBand({
  kind,
  cells,
  style,
  onAction,
  editable,
}: PageBandProps) {
  const className = kind === "head" ? "page-head" : "page-foot";

  const cell = (i: 0 | 1 | 2): ReactNode => {
    if (editable) {
      return (
        <EditableText
          docId={editable.docId}
          path={[editable.bandKey, i]}
          value={cells[i]}
        />
      );
    }
    return cells[i];
  };

  return (
    <div className={className} style={style}>
      <div>
        {onAction ? (
          <button
            type="button"
            className="page-band-action"
            onClick={onAction}
          >
            {cell(0)}
          </button>
        ) : (
          cell(0)
        )}
      </div>
      <div>{cell(1)}</div>
      <div>{cell(2)}</div>
    </div>
  );
}
