import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import {
  EditorContent,
  ReactNodeViewRenderer,
  useEditor,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { marked } from "marked";
import TurndownService from "turndown";
import { presignAndUpload } from "@/lib/uploads";
import { ResizableImage } from "@/pages/admin/ResizableImage";

type ImageAlign = "left" | "center" | "right";

const SizedImage = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          if (!w) {
            const m = (el.getAttribute("style") ?? "").match(
              /width:\s*(\d+)px/i,
            );
            return m ? Number(m[1]) : null;
          }
          const n = Number(w.replace(/px$/i, ""));
          return Number.isFinite(n) ? n : null;
        },
        renderHTML: (attrs) => {
          if (typeof attrs.width !== "number") return {};
          return {
            width: String(attrs.width),
            style: `width: ${attrs.width}px`,
          };
        },
      },
      align: {
        default: null as ImageAlign | null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-align");
          return v === "left" || v === "center" || v === "right" ? v : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.align) return {};
          return { "data-align": attrs.align };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImage);
  },
});

export type BlogRichEditorHandle = {
  /** Convert current content to markdown for save. */
  getMarkdown: () => string;
  /** Snapshot of current HTML for dirty tracking. */
  getHTML: () => string;
  /** Insert an image node at the caret. */
  insertImage: (src: string, alt?: string) => void;
  /** Insert linked text at the caret. */
  insertLink: (href: string, label: string) => void;
  /** Replace document with markdown (used after save to reset dirty baseline). */
  setMarkdown: (markdown: string) => void;
  focus: () => void;
};

type Props = {
  initialMarkdown: string;
  /**
   * Slug of the post (or null while creating). When null, drop/paste image
   * uploads are blocked since we don't yet have a folder to write into.
   */
  slug: string | null;
  /** Notified on every editor update — used for dirty tracking. */
  onChange?: () => void;
  /** Called after a drop/paste image upload completes (parent can refresh explorer). */
  onAssetUploaded?: () => void;
  disabled?: boolean;
};

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
});

// Preserve relative attributes on links/images that turndown's default
// rules might otherwise strip (target/rel/title).
turndown.addRule("linkWithTitle", {
  filter: (node) =>
    node.nodeName === "A" && Boolean((node as HTMLElement).getAttribute("href")),
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const href = el.getAttribute("href") ?? "";
    const title = el.getAttribute("title");
    return title
      ? `[${content}](${href} "${title}")`
      : `[${content}](${href})`;
  },
});

// Plain `<img>` -> markdown shorthand. With width/align we fall back to
// raw HTML in the markdown so the extra attributes survive a round-trip
// (marked passes raw HTML through; the public renderer sanitizes it).
turndown.addRule("sizedImage", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const src = el.getAttribute("src") ?? "";
    if (!src) return "";
    const alt = el.getAttribute("alt") ?? "";
    const widthAttr = el.getAttribute("width");
    const alignAttr = el.getAttribute("data-align");
    if (widthAttr || alignAttr) {
      const parts = [`src="${escapeAttr(src)}"`];
      if (alt) parts.push(`alt="${escapeAttr(alt)}"`);
      if (widthAttr) parts.push(`width="${escapeAttr(widthAttr)}"`);
      if (alignAttr) parts.push(`data-align="${escapeAttr(alignAttr)}"`);
      return `<img ${parts.join(" ")}>`;
    }
    return `![${alt}](${src})`;
  },
});

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function htmlFromMarkdown(md: string): string {
  return String(marked.parse(md ?? "", { async: false }));
}

function markdownFromHtml(html: string): string {
  return turndown.turndown(html).trim();
}

export const BlogRichEditor = forwardRef<BlogRichEditorHandle, Props>(
  function BlogRichEditor(
    { initialMarkdown, slug, onChange, onAssetUploaded, disabled = false },
    ref,
  ) {
    const slugRef = useRef(slug);
    useEffect(() => {
      slugRef.current = slug;
    }, [slug]);

    const onAssetUploadedRef = useRef(onAssetUploaded);
    useEffect(() => {
      onAssetUploadedRef.current = onAssetUploaded;
    }, [onAssetUploaded]);

    const initialHtml = useMemo(
      () => htmlFromMarkdown(initialMarkdown),
      [initialMarkdown],
    );

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer" },
        }),
        SizedImage.configure({ inline: true, allowBase64: false }),
      ],
      content: initialHtml,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "core-rte-content blog-prose",
          spellcheck: "true",
        },
        handleDrop: (_view, event) => {
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) return false;
          const images = Array.from(files).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (images.length === 0) return false;
          event.preventDefault();
          for (const file of images) void uploadAndInsert(file);
          return true;
        },
        handlePaste: (_view, event) => {
          const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
            f.type.startsWith("image/"),
          );
          if (!file) return false;
          event.preventDefault();
          void uploadAndInsert(file);
          return true;
        },
      },
      onUpdate: () => {
        onChange?.();
      },
    });

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [editor, disabled]);

    // Reload content when initialMarkdown changes (e.g. after creating a draft
    // or after the post is reloaded via setMarkdown).
    useEffect(() => {
      if (!editor) return;
      const currentHtml = editor.getHTML();
      if (currentHtml === initialHtml) return;
      editor.commands.setContent(initialHtml, { emitUpdate: false });
    }, [editor, initialHtml]);

    async function uploadAndInsert(file: File) {
      const currentSlug = slugRef.current;
      const ed = editor;
      if (!ed) return;
      if (!currentSlug) {
        window.alert("Save the draft once before uploading images.");
        return;
      }
      const safeName = uniqueAssetName(file.name || "image", file.type);
      try {
        const result = await presignAndUpload({
          tokenUrl: "/api/admin/blog/upload-token",
          pathname: `blog/${currentSlug}/${safeName}`,
          file,
          contentType: file.type || "application/octet-stream",
        });
        const alt = (file.name || "image").replace(/\.[^.]+$/, "");
        ed.chain().focus().setImage({ src: result.publicUrl, alt }).run();
        onAssetUploadedRef.current?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        window.alert(`Upload failed: ${message}`);
      }
    }

    useImperativeHandle(
      ref,
      (): BlogRichEditorHandle => ({
        getMarkdown: () => (editor ? markdownFromHtml(editor.getHTML()) : ""),
        getHTML: () => (editor ? editor.getHTML() : initialHtml),
        insertImage: (src, alt) => {
          editor?.chain().focus().setImage({ src, alt: alt ?? "" }).run();
        },
        insertLink: (href, label) => {
          if (!editor) return;
          editor
            .chain()
            .focus()
            .insertContent({
              type: "text",
              text: label,
              marks: [{ type: "link", attrs: { href } }],
            })
            .insertContent(" ")
            .run();
        },
        setMarkdown: (markdown) => {
          if (!editor) return;
          editor.commands.setContent(htmlFromMarkdown(markdown), {
            emitUpdate: false,
          });
        },
        focus: () => editor?.commands.focus(),
      }),
      [editor, initialHtml],
    );

    return (
      <div className={`core-rte${disabled ? " core-rte--disabled" : ""}`}>
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  },
);

type ToolbarProps = { editor: Editor | null };

function Toolbar({ editor }: ToolbarProps) {
  // Subscribe to selection/transaction so the active states re-render.
  // The component re-renders whenever the editor fires `selectionUpdate` /
  // `transaction` because Tiptap's React adapter handles the binding for us
  // (useEditor returns a stable instance that triggers renders on changes).
  if (!editor) return <div className="core-rte-toolbar" aria-busy="true" />;

  const Btn = ({
    onClick,
    isActive = false,
    disabled = false,
    title,
    children,
    style,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    style?: CSSProperties;
  }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`core-rte-toolbar__btn${
        isActive ? " core-rte-toolbar__btn--active" : ""
      }`}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const insertImage = () => {
    const url = window.prompt("Image URL", "https://");
    if (!url) return;
    const alt = window.prompt("Alt text (optional)", "") ?? "";
    editor.chain().focus().setImage({ src: url, alt }).run();
  };

  const headingLevel = ([1, 2, 3] as const).find((lvl) =>
    editor.isActive("heading", { level: lvl }),
  );
  const blockValue = headingLevel ? `h${headingLevel}` : "p";

  return (
    <div className="core-rte-toolbar" role="toolbar" aria-label="Formatting">
      <select
        className="core-rte-toolbar__select"
        value={blockValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") {
            editor.chain().focus().setParagraph().run();
          } else {
            const lvl = Number(v.slice(1)) as 1 | 2 | 3;
            editor.chain().focus().toggleHeading({ level: lvl }).run();
          }
        }}
        aria-label="Block style"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <span className="core-rte-toolbar__sep" aria-hidden="true" />

      <Btn
        title="Bold (⌘B)"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={{ fontWeight: 700 }}
      >
        B
      </Btn>
      <Btn
        title="Italic (⌘I)"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={{ fontStyle: "italic" }}
      >
        I
      </Btn>
      <Btn
        title="Strikethrough"
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        style={{ textDecoration: "line-through" }}
      >
        S
      </Btn>
      <Btn
        title="Inline code"
        isActive={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
      >
        {"</>"}
      </Btn>

      <span className="core-rte-toolbar__sep" aria-hidden="true" />

      <Btn
        title="Bulleted list"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </Btn>
      <Btn
        title="Numbered list"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </Btn>
      <Btn
        title="Quote"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </Btn>
      <Btn
        title="Code block"
        isActive={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {"{ }"}
      </Btn>
      <Btn
        title="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        —
      </Btn>

      <span className="core-rte-toolbar__sep" aria-hidden="true" />

      <Btn
        title="Insert link"
        isActive={editor.isActive("link")}
        onClick={setLink}
      >
        🔗
      </Btn>
      <Btn
        title="Remove link"
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        ⌧
      </Btn>
      <Btn title="Insert image (URL)" onClick={insertImage}>
        🖼
      </Btn>

      {editor.isActive("image") && <ImageControls editor={editor} />}

      <span className="core-rte-toolbar__sep" aria-hidden="true" />

      <Btn
        title="Undo (⌘Z)"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↺
      </Btn>
      <Btn
        title="Redo (⇧⌘Z)"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↻
      </Btn>

      <span className="core-rte-toolbar__sep" aria-hidden="true" />

      <Btn
        title="Clear formatting"
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
      >
        ⌫
      </Btn>
    </div>
  );
}

function ImageControls({ editor }: { editor: Editor }) {
  const align = (editor.getAttributes("image").align as ImageAlign | null) ?? null;

  const setAlign = (next: ImageAlign | null) => {
    editor
      .chain()
      .focus()
      .updateAttributes("image", { align: next })
      .run();
  };

  const setSize = (kind: "small" | "medium" | "full" | "natural") => {
    if (kind === "natural") {
      editor.chain().focus().updateAttributes("image", { width: null }).run();
      return;
    }
    // Resolve a px width from the editor surface so the result is consistent
    // across viewports rather than tied to an arbitrary preset.
    const surface = editor.options.element as HTMLElement | undefined;
    const surfaceWidth = surface?.clientWidth ?? 720;
    const factor = kind === "small" ? 0.33 : kind === "medium" ? 0.66 : 1;
    const width = Math.max(64, Math.round(surfaceWidth * factor));
    editor.chain().focus().updateAttributes("image", { width }).run();
  };

  const remove = () => editor.chain().focus().deleteSelection().run();

  return (
    <>
      <span className="core-rte-toolbar__sep" aria-hidden="true" />
      <span
        className="core-rte-toolbar__hint"
        title="Image options"
        aria-hidden="true"
      >
        IMG
      </span>
      <button
        type="button"
        title="Align left"
        aria-label="Align left"
        aria-pressed={align === "left"}
        onClick={() => setAlign("left")}
        className={`core-rte-toolbar__btn${align === "left" ? " core-rte-toolbar__btn--active" : ""}`}
      >
        ⇤
      </button>
      <button
        type="button"
        title="Align center"
        aria-label="Align center"
        aria-pressed={align === "center"}
        onClick={() => setAlign("center")}
        className={`core-rte-toolbar__btn${align === "center" ? " core-rte-toolbar__btn--active" : ""}`}
      >
        ⇔
      </button>
      <button
        type="button"
        title="Align right"
        aria-label="Align right"
        aria-pressed={align === "right"}
        onClick={() => setAlign("right")}
        className={`core-rte-toolbar__btn${align === "right" ? " core-rte-toolbar__btn--active" : ""}`}
      >
        ⇥
      </button>
      <button
        type="button"
        title="Clear alignment"
        aria-label="Clear alignment"
        onClick={() => setAlign(null)}
        disabled={!align}
        className="core-rte-toolbar__btn"
      >
        ⌧
      </button>
      <span className="core-rte-toolbar__sep" aria-hidden="true" />
      <button
        type="button"
        title="Small (33%)"
        onClick={() => setSize("small")}
        className="core-rte-toolbar__btn"
      >
        ⅓
      </button>
      <button
        type="button"
        title="Medium (66%)"
        onClick={() => setSize("medium")}
        className="core-rte-toolbar__btn"
      >
        ⅔
      </button>
      <button
        type="button"
        title="Full width"
        onClick={() => setSize("full")}
        className="core-rte-toolbar__btn"
      >
        ▭
      </button>
      <button
        type="button"
        title="Natural size"
        onClick={() => setSize("natural")}
        className="core-rte-toolbar__btn"
      >
        ⤺
      </button>
      <button
        type="button"
        title="Delete image"
        onClick={remove}
        className="core-rte-toolbar__btn"
        style={{ color: "#c44a36" }}
      >
        ×
      </button>
    </>
  );
}

function uniqueAssetName(filename: string, mime: string): string {
  const dot = filename.lastIndexOf(".");
  const rawBase = dot > 0 ? filename.slice(0, dot) : filename;
  const rawExt = dot > 0 ? filename.slice(dot + 1) : extFromMime(mime);
  const base = rawBase.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const ext = (rawExt || "bin").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  const stem = base || "image";
  return `${Date.now()}-${stem}.${ext}`;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  return "bin";
}
