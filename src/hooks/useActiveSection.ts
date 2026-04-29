import { useEffect, useState } from "react";

/**
 * Tracks which section is currently under the viewport's vertical centre.
 *
 * The previous implementation used `threshold: 0.45`, which silently fails
 * when a section is taller than ~2.2× the viewport — its peak intersection
 * ratio never crosses 0.45, so the nav stops updating. Instead, collapse
 * the observer's effective area to a thin horizontal band at viewport
 * centre via rootMargin; whichever section's body is crossing that band
 * is the active one.
 */
export function useActiveSection(sectionIds: readonly string[]): string {
  const [active, setActive] = useState<string>(sectionIds[0] ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sectionIds]);

  return active;
}
