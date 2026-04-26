import { useMemo } from "react";
import { renderMarkdown } from "@/lib/markdown";

type Props = {
  /** Markdown source authored in the admin editor. */
  markdown: string;
};

export function BlogRenderer({ markdown }: Props) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return (
    <div
      className="blog-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
