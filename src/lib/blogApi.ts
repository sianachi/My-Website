import { z } from "zod";
import {
  AdminBlogListSchema,
  BlogPostListItemSchema,
  BlogPostListSchema,
  BlogPostSchema,
  type AdminBlogList,
  type AdminBlogListItem,
  type BlogCreateInput,
  type BlogPost,
  type BlogPostList,
  type BlogPostListItem,
  type BlogStatus,
  type BlogUpdateInput,
} from "@/shared/data/blog";

const NeighborsSchema = z.object({
  prev: BlogPostListItemSchema.nullable().optional(),
  next: BlogPostListItemSchema.nullable().optional(),
});
export type BlogNeighbors = z.infer<typeof NeighborsSchema>;

const RelatedSchema = z.object({
  posts: z.array(BlogPostListItemSchema),
});

export type ZodIssueLite = { path: (string | number)[]; message: string };

export class BlogApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly issues: ZodIssueLite[];
  constructor(code: string, status: number, issues: ZodIssueLite[] = []) {
    const message =
      code === "validation_failed" && issues.length
        ? `Validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"})`
        : code;
    super(message);
    this.name = "BlogApiError";
    this.code = code;
    this.status = status;
    this.issues = issues;
  }
}

async function getJson<T>(
  path: string,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(path, { signal });
  if (!res.ok) throw new Error(`${path} responded ${res.status}`);
  return parse(await res.json());
}

async function adminFetch(
  path: string,
  init: RequestInit,
): Promise<unknown> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload: unknown = await res.json().catch(() => ({}));
  if (res.ok) return payload;
  const obj = (payload ?? {}) as {
    error?: string;
    issues?: ZodIssueLite[];
    message?: string;
  };
  const code = obj.error ?? obj.message ?? `http_${res.status}`;
  const issues = Array.isArray(obj.issues) ? obj.issues : [];
  throw new BlogApiError(code, res.status, issues);
}

export const blogApi = {
  list: (
    options: { tag?: string; signal?: AbortSignal } = {},
  ): Promise<BlogPostList> => {
    const url = options.tag
      ? `/api/blog?tag=${encodeURIComponent(options.tag)}`
      : "/api/blog";
    return getJson(url, (v) => BlogPostListSchema.parse(v), options.signal);
  },
  get: (slug: string, signal?: AbortSignal): Promise<BlogPost> =>
    getJson(
      `/api/blog?slug=${encodeURIComponent(slug)}`,
      (v) => BlogPostSchema.parse(v),
      signal,
    ),
  neighbors: (slug: string, signal?: AbortSignal): Promise<BlogNeighbors> =>
    getJson(
      `/api/blog/neighbors?slug=${encodeURIComponent(slug)}`,
      (v) => NeighborsSchema.parse(v),
      signal,
    ),
  related: (
    slug: string,
    signal?: AbortSignal,
  ): Promise<BlogPostListItem[]> =>
    getJson(
      `/api/blog/related?slug=${encodeURIComponent(slug)}`,
      (v) => RelatedSchema.parse(v).posts,
      signal,
    ),
};

export type BlogFile = {
  filename: string;
  key: string;
  size: number;
  lastModified: string | null;
  url: string;
};

export const adminBlogApi = {
  list: async (): Promise<AdminBlogList> => {
    const data = await adminFetch("/api/admin/blog", { method: "GET" });
    return AdminBlogListSchema.parse(data);
  },
  listFiles: async (slug: string): Promise<{ slug: string; files: BlogFile[] }> => {
    const data = await adminFetch(
      `/api/admin/blog/files?slug=${encodeURIComponent(slug)}`,
      { method: "GET" },
    );
    return data as { slug: string; files: BlogFile[] };
  },
  deleteFile: async (slug: string, filename: string): Promise<void> => {
    await adminFetch("/api/admin/blog/files/delete", {
      method: "POST",
      body: JSON.stringify({ slug, filename }),
    });
  },
  get: async (slug: string): Promise<BlogPost> => {
    const data = await adminFetch(
      `/api/admin/blog?slug=${encodeURIComponent(slug)}`,
      { method: "GET" },
    );
    return BlogPostSchema.parse(data);
  },
  create: async (payload: BlogCreateInput): Promise<BlogPost> => {
    const data = await adminFetch("/api/admin/blog", {
      method: "POST",
      body: JSON.stringify({ action: "create", payload }),
    });
    return BlogPostSchema.parse(data);
  },
  update: async (
    slug: string,
    payload: BlogUpdateInput,
  ): Promise<BlogPost> => {
    const data = await adminFetch("/api/admin/blog", {
      method: "POST",
      body: JSON.stringify({ action: "update", slug, payload }),
    });
    return BlogPostSchema.parse(data);
  },
  setStatus: async (slug: string, status: BlogStatus): Promise<BlogPost> => {
    const data = await adminFetch("/api/admin/blog", {
      method: "POST",
      body: JSON.stringify({ action: "set-status", slug, status }),
    });
    return BlogPostSchema.parse(data);
  },
};

export type { AdminBlogListItem };
