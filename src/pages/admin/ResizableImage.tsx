import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

const MIN_WIDTH = 64;

export function ResizableImage({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [draftWidth, setDraftWidth] = useState<number | null>(null);

  // Reset the local draft once the editor commits the new width.
  useEffect(() => {
    if (draftWidth === null) return;
    const committed =
      typeof node.attrs.width === "number" ? node.attrs.width : null;
    if (committed === draftWidth) setDraftWidth(null);
  }, [node.attrs.width, draftWidth]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;

    const startX = e.clientX;
    const startWidth = img.getBoundingClientRect().width;
    let lastWidth = startWidth;

    const onMove = (mv: MouseEvent) => {
      mv.preventDefault();
      const next = Math.max(MIN_WIDTH, Math.round(startWidth + (mv.clientX - startX)));
      lastWidth = next;
      setDraftWidth(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      updateAttributes({ width: Math.round(lastWidth) });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const align = (node.attrs.align as string | null) ?? null;
  const width =
    draftWidth ??
    (typeof node.attrs.width === "number" ? node.attrs.width : null);

  return (
    <NodeViewWrapper
      as="span"
      className={`rt-img-wrap${selected ? " rt-img-wrap--selected" : ""}`}
      data-align={align ?? undefined}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt ?? ""}
        title={node.attrs.title ?? undefined}
        data-align={align ?? undefined}
        style={width ? { width: `${width}px` } : undefined}
        draggable={false}
      />
      <span
        className="rt-img-handle"
        onMouseDown={startResize}
        contentEditable={false}
        aria-hidden="true"
        title="Drag to resize"
      />
    </NodeViewWrapper>
  );
}
