import { createElement, type CSSProperties, type JSX } from "react";

type HtmlProps = {
  html: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
};

/**
 * Render trusted HTML from the content JSON.
 * Content is authored by the site owner — not user input — so
 * dangerouslySetInnerHTML is safe here.
 */
export function Html({ html, as = "span", className, style }: HtmlProps) {
  return createElement(as, {
    className,
    style,
    dangerouslySetInnerHTML: { __html: html },
  });
}
