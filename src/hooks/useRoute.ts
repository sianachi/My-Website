import { useCallback, useEffect, useState } from "react";

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

export function useRoute() {
  const [path, setPath] = useState<string>(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
}
