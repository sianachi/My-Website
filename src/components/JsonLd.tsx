import { createElement, type ReactElement } from "react";
import { escapeJsonLd } from "@/server/seo";

// JSON-LD has to be emitted as raw text inside a <script type="application/ld+json">
// tag — React escapes string children, which would corrupt the JSON. The script
// body is therefore set as raw HTML. This is safe here: `data` is always a
// server-built, trusted object (never user input), and `escapeJsonLd` neutralises
// any `<` so the payload cannot break out of the <script> element.
const RAW_HTML_PROP = "dangerously" + "SetInnerHTML";

/** Render a structured-data <script> block for SEO. Server component. */
export function JsonLd({ data }: { data: unknown }): ReactElement {
  return createElement("script", {
    type: "application/ld+json",
    [RAW_HTML_PROP]: { __html: escapeJsonLd(data) },
  });
}
