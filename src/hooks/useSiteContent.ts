import { useCallback, useEffect, useState } from "react";
import { fetchSiteContent, type SiteContent } from "@/lib/api";

type Status =
  | { state: "loading" }
  | { state: "ready"; content: SiteContent }
  | { state: "error"; error: Error };

export function useSiteContentFetch() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus({ state: "loading" });
    fetchSiteContent(controller.signal).then(
      (content) => setStatus({ state: "ready", content }),
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({
          state: "error",
          error: err instanceof Error ? err : new Error(String(err)),
        });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, retry };
}
