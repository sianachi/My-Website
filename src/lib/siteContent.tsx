import { createContext, useContext, type ReactNode } from "react";
import type { SiteContent } from "@/lib/api";

const SiteContentContext = createContext<SiteContent | null>(null);

type SiteContentProviderProps = {
  value: SiteContent;
  children: ReactNode;
};

export function SiteContentProvider({
  value,
  children,
}: SiteContentProviderProps) {
  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

function useSiteContent(): SiteContent {
  const ctx = useContext(SiteContentContext);
  if (!ctx) {
    throw new Error(
      "useSiteContent must be called inside <SiteContentProvider>",
    );
  }
  return ctx;
}

export const useCoverContent = () => useSiteContent().cover;
export const useAboutContent = () => useSiteContent().about;
export const useWorkContent = () => useSiteContent().work;
export const useContactContent = () => useSiteContent().contact;
