import type { MetadataRoute } from "next";
import { getPublishedPostDocs } from "@/server/blog";
import { absoluteUrl } from "@/server/seo";

// Generated per request — driven by the published-posts list in MongoDB.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPostDocs();

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), priority: 1.0 },
    { url: absoluteUrl("/blog"), priority: 0.8 },
  ];

  const tags = new Set<string>();
  for (const post of posts) {
    entries.push({
      url: absoluteUrl(`/blog/${post._id}`),
      lastModified: post.updatedAt ?? post.publishedAt,
      priority: 0.7,
    });
    for (const tag of post.tags ?? []) tags.add(tag);
  }
  for (const tag of [...tags].sort()) {
    entries.push({ url: absoluteUrl(`/blog/tag/${tag}`), priority: 0.5 });
  }

  return entries;
}
