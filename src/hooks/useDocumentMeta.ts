import { useEffect } from "react";

type Meta = {
  title: string;
  description?: string;
};

const DEFAULT_TITLE = "Osinachi Nwagboso — Portfolio · 2026";
const DEFAULT_DESCRIPTION =
  "Backend engineer — C# / .NET, Azure & AWS, edge systems. Based in Birmingham, UK.";

/**
 * Updates document.title and meta[name=description] for SPA navigation.
 * Production HTML is already injected with route-correct meta by the SSR
 * middleware in server/routes/ssr.ts; this hook keeps things in sync once
 * the user starts navigating client-side.
 */
export function useDocumentMeta({ title, description }: Meta): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousTitle = document.title;
    document.title = title;

    const tag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousDescription = tag?.getAttribute("content") ?? null;
    if (tag && description !== undefined) {
      tag.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (tag && previousDescription !== null) {
        tag.setAttribute("content", previousDescription);
      } else if (tag && description !== undefined) {
        tag.setAttribute("content", DEFAULT_DESCRIPTION);
      }
    };
  }, [title, description]);
}
