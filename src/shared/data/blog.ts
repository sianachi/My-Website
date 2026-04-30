import { z } from "zod";

export const BLOG_STATUSES = ["draft", "published", "archived"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export const BlogSlugSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "slug must be lowercase alphanumerics separated by single hyphens",
  });

/**
 * Author-defined topic. Same shape as a slug — used directly as a URL path
 * segment under /blog/tag/<tag>.
 */
export const BlogTagSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "tag must be lowercase alphanumerics separated by single hyphens",
  });

const BlogTagsSchema = z.array(BlogTagSchema).max(10).default([]);

/**
 * Full post returned by GET endpoints. `content` is markdown source; `html`
 * is the same body pre-rendered by the server (Shiki + footnotes + heading
 * IDs) so the reader can ship without a markdown bundle.
 */
export const BlogPostSchema = z.object({
  slug: BlogSlugSchema,
  title: z.string().min(1).max(200),
  excerpt: z.string().max(280).optional().or(z.literal("")),
  content: z.string(),
  html: z.string().optional(),
  tags: BlogTagsSchema,
  coverImage: z.string().url().optional(),
  readingMinutes: z.number().int().positive().optional(),
  status: z.enum(BLOG_STATUSES),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  /**
   * Folio is a simple 1-based ordinal: oldest published post is 001, newest
   * is N. Derived server-side at read time, never persisted, optional on the
   * wire so older clients/responses still parse during staged deploys.
   */
  folio: z.number().int().nonnegative().default(0),
  folioTotal: z.number().int().nonnegative().default(0),
});
export type BlogPost = z.infer<typeof BlogPostSchema>;

export const BlogPostListItemSchema = BlogPostSchema.pick({
  slug: true,
  title: true,
  excerpt: true,
  publishedAt: true,
  updatedAt: true,
  tags: true,
  coverImage: true,
  readingMinutes: true,
  folio: true,
  folioTotal: true,
});
export type BlogPostListItem = z.infer<typeof BlogPostListItemSchema>;

export const BlogPostListSchema = z.object({
  posts: z.array(BlogPostListItemSchema),
});
export type BlogPostList = z.infer<typeof BlogPostListSchema>;

export const AdminBlogListItemSchema = BlogPostSchema.pick({
  slug: true,
  title: true,
  excerpt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  folio: true,
  folioTotal: true,
});
export type AdminBlogListItem = z.infer<typeof AdminBlogListItemSchema>;

export const AdminBlogListSchema = z.object({
  posts: z.array(AdminBlogListItemSchema),
});
export type AdminBlogList = z.infer<typeof AdminBlogListSchema>;

export const BlogCreateInputSchema = z.object({
  slug: BlogSlugSchema,
  title: z.string().min(1).max(200),
  excerpt: z.string().max(280).optional(),
  content: z.string(),
  tags: BlogTagsSchema.optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
});
export type BlogCreateInput = z.infer<typeof BlogCreateInputSchema>;

export const BlogUpdateInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(280).optional().or(z.literal("")),
  content: z.string().optional(),
  status: z.enum(BLOG_STATUSES).optional(),
  tags: BlogTagsSchema.optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
});
export type BlogUpdateInput = z.infer<typeof BlogUpdateInputSchema>;

/**
 * Normalize a free-form list of tag inputs (admin UI lets users type chips).
 * Trims, lowercases, replaces internal whitespace/separators with hyphens,
 * drops empties + duplicates, caps at 10.
 */
export function normalizeTags(input: readonly string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (!tag) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 10) break;
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** S3 prefix for everything belonging to a single post: body + assets. */
export function blogPrefix(slug: string): string {
  return `blog/${slug}/`;
}

/** Where a post's markdown body lives in S3, keyed by slug. */
export function blogContentKey(slug: string): string {
  return `${blogPrefix(slug)}post.md`;
}

/** Reserved filename inside a post's folder — never user-managed. */
export const BLOG_BODY_FILENAME = "post.md";

/**
 * Validate an uploaded asset filename. Accepts any single segment with
 * letters, digits, dot, dash, or underscore. Rejects path traversal,
 * slashes, and the reserved body filename.
 */
export function isSafeBlogFilename(name: string): boolean {
  if (!name || name.length > 200) return false;
  if (name === BLOG_BODY_FILENAME) return false;
  if (name.includes("/") || name.includes("..")) return false;
  return /^[a-zA-Z0-9._-]+$/.test(name);
}
