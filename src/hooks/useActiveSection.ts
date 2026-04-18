import { useEffect, useState } from "react";

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
      { threshold: 0.45 },
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sectionIds]);

  return active;
}
