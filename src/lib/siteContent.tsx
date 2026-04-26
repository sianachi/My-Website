import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchSiteContent, type SiteContent } from "@/lib/api";
import { adminApi, ContentSaveError } from "@/lib/adminApi";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
  type ContentDocId,
} from "@/shared/data/schemas";
import { useIsAdmin } from "@/lib/adminAware";

export type FieldPath = ReadonlyArray<string | number>;

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving"; docId: ContentDocId }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string; issues: { path: (string | number)[]; message: string }[] };

type SiteContentContextValue = {
  content: SiteContent;
  setField: (
    docId: ContentDocId,
    path: FieldPath,
    value: unknown,
  ) => Promise<void>;
  status: SaveStatus;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

const DOC_SCHEMAS = {
  cover: CoverContentSchema,
  about: AboutContentSchema,
  work: WorkContentSchema,
  contact: ContactContentSchema,
} as const;

type SiteContentProviderProps = {
  initial: SiteContent;
  children: ReactNode;
};

export function SiteContentProvider({
  initial,
  children,
}: SiteContentProviderProps) {
  const isAdmin = useIsAdmin();
  const [content, setContent] = useState<SiteContent>(initial);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const savedTimer = useRef<number | null>(null);
  const adminRefetchedRef = useRef(false);

  useEffect(() => {
    if (!isAdmin || adminRefetchedRef.current) return;
    adminRefetchedRef.current = true;
    const controller = new AbortController();
    fetchSiteContent({ signal: controller.signal, bust: true })
      .then((fresh) => setContent(fresh))
      .catch(() => {
        /* keep stale content rather than blanking the page */
      });
    return () => controller.abort();
  }, [isAdmin]);

  const setField = useCallback(
    async (docId: ContentDocId, path: FieldPath, value: unknown) => {
      if (!isAdmin) return;

      let prevDoc: SiteContent[ContentDocId] | null = null;
      let nextDoc: unknown = null;

      setContent((curr) => {
        prevDoc = curr[docId];
        const updated = setIn(curr[docId], path, value);
        nextDoc = updated;
        return { ...curr, [docId]: updated } as SiteContent;
      });

      const schema = DOC_SCHEMAS[docId];
      const parsed = schema.safeParse(nextDoc);
      if (!parsed.success) {
        if (prevDoc !== null) {
          const restore = prevDoc;
          setContent((curr) => ({ ...curr, [docId]: restore }) as SiteContent);
        }
        setStatus({
          kind: "error",
          message: "Validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: [...i.path] as (string | number)[],
            message: i.message,
          })),
        });
        return;
      }

      setStatus({ kind: "saving", docId });
      try {
        await adminApi.saveContent(docId, parsed.data);
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        setStatus({ kind: "saved", at: Date.now() });
        savedTimer.current = window.setTimeout(() => {
          setStatus({ kind: "idle" });
        }, 2500);
      } catch (err) {
        if (prevDoc !== null) {
          const restore = prevDoc;
          setContent((curr) => ({ ...curr, [docId]: restore }) as SiteContent);
        }
        if (err instanceof ContentSaveError) {
          setStatus({
            kind: "error",
            message: err.message,
            issues: err.issues,
          });
        } else {
          setStatus({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
            issues: [],
          });
        }
      }
    },
    [isAdmin],
  );

  const value = useMemo<SiteContentContextValue>(
    () => ({ content, setField, status }),
    [content, setField, status],
  );

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

function useSiteContentCtx(): SiteContentContextValue {
  const ctx = useContext(SiteContentContext);
  if (!ctx) {
    throw new Error(
      "useSiteContent must be called inside <SiteContentProvider>",
    );
  }
  return ctx;
}

export const useCoverContent = () => useSiteContentCtx().content.cover;
export const useAboutContent = () => useSiteContentCtx().content.about;
export const useWorkContent = () => useSiteContentCtx().content.work;
export const useContactContent = () => useSiteContentCtx().content.contact;

export function useSetContentField() {
  return useSiteContentCtx().setField;
}

export function useContentSaveStatus(): SaveStatus {
  return useSiteContentCtx().status;
}

export function getAt(obj: unknown, path: FieldPath): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null) return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

function setIn<T>(obj: T, path: FieldPath, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const arr = ((obj as unknown as unknown[]) ?? []).slice();
    arr[head] = setIn(arr[head], rest, value);
    return arr as unknown as T;
  }
  const src = (obj as Record<string, unknown> | undefined) ?? {};
  return {
    ...src,
    [head]: setIn(src[head], rest, value),
  } as T;
}
