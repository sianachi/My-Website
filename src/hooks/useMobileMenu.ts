import { useCallback, useEffect, useState } from "react";

export function useMobileMenu() {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return { isOpen, open, close, toggle };
}
