"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Compatibility shim over Next's router so components written for the old
 * history.pushState SPA router keep working unchanged. Returns the current
 * pathname and an imperative `navigate`.
 */
export function useRoute() {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = useCallback(
    (to: string) => {
      router.push(to);
    },
    [router],
  );
  return { path: pathname || "/", navigate };
}
