"use client";

import { useRoute } from "@/hooks/useRoute";
import { AdminPage } from "@/screens/AdminPage";

/**
 * Admin console island. The `/core` route is a single optional-catch-all
 * segment; AdminConsole does its own sub-path routing, so it just needs the
 * current pathname and an imperative navigate.
 */
export function CoreClient() {
  const { path, navigate } = useRoute();
  return <AdminPage path={path} navigate={navigate} />;
}
