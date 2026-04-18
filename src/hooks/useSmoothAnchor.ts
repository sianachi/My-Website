import { useEffect } from "react";

export function useSmoothAnchor(onNavigate?: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const id = href.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      onNavigate?.();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onNavigate]);
}
