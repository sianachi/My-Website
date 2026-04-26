import {
  Suspense,
  createElement,
  lazy,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import { useIsAdmin } from "@/lib/adminAware";
import {
  getAt,
  useSetContentField,
  type FieldPath,
} from "@/lib/siteContent";
import type { ContentDocId } from "@/shared/data/schemas";

const InlineEditor = lazy(() => import("@/components/InlineEditor"));

type CommonProps = {
  docId: ContentDocId;
  path: FieldPath;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
};

function useEditable() {
  const isAdmin = useIsAdmin();
  const setField = useSetContentField();
  return { isAdmin, setField };
}

export function EditableText({
  docId,
  path,
  value,
  as = "span",
  className,
  style,
}: CommonProps & { value: string }) {
  const { isAdmin, setField } = useEditable();
  const [editing, setEditing] = useState(false);

  if (!isAdmin) {
    return createElement(as, { className, style }, value);
  }

  if (!editing) {
    return createElement(
      as,
      {
        className: cx(className, "ed-target ed-target--text"),
        style,
        role: "textbox",
        tabIndex: 0,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setEditing(true);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditing(true);
          }
        },
        title: "Click to edit",
      },
      value || createElement("span", { className: "ed-empty" }, "—"),
    );
  }

  return (
    <Suspense fallback={createElement(as, { className, style }, value)}>
      <InlineEditor
        as={as}
        className={cx(className, "ed-active")}
        style={style}
        initialValue={value}
        mode="text"
        onCommit={(next) => {
          setEditing(false);
          if (next !== value) void setField(docId, path, next);
        }}
      />
    </Suspense>
  );
}

export function EditableHtml({
  docId,
  path,
  html,
  as = "span",
  className,
  style,
}: CommonProps & { html: string }) {
  const { isAdmin, setField } = useEditable();
  const [editing, setEditing] = useState(false);

  if (!isAdmin) {
    return createElement(as, {
      className,
      style,
      dangerouslySetInnerHTML: { __html: html },
    });
  }

  if (!editing) {
    return createElement(as, {
      className: cx(className, "ed-target ed-target--html"),
      style,
      role: "textbox",
      tabIndex: 0,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(true);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      },
      title: "Click to edit",
      dangerouslySetInnerHTML: { __html: html || "&mdash;" },
    });
  }

  return (
    <Suspense
      fallback={createElement(as, {
        className,
        style,
        dangerouslySetInnerHTML: { __html: html },
      })}
    >
      <InlineEditor
        as={as}
        className={cx(className, "ed-active")}
        style={style}
        initialValue={html}
        mode="html"
        onCommit={(next) => {
          setEditing(false);
          if (next !== html) void setField(docId, path, next);
        }}
      />
    </Suspense>
  );
}

export function getStringAt(
  source: unknown,
  path: FieldPath,
  fallback = "",
): string {
  const v = getAt(source, path);
  return typeof v === "string" ? v : fallback;
}

function cx(...parts: (string | undefined | false | null)[]): string {
  return parts.filter(Boolean).join(" ");
}
