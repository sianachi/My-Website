import { getPublishedPostDocs } from "@/server/blog";
import { absoluteUrl, escapeXml } from "@/server/seo";

export const dynamic = "force-dynamic";

function entry(
  url: string,
  opts: { lastmod?: string; priority: number },
): string {
  const lastmod = opts.lastmod
    ? `\n    <lastmod>${escapeXml(opts.lastmod)}</lastmod>`
    : "";
  return `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod}\n    <priority>${opts.priority}</priority>\n  </url>`;
}

export async function GET(): Promise<Response> {
  const posts = await getPublishedPostDocs();

  const entries: string[] = [
    entry(absoluteUrl("/"), { priority: 1.0 }),
    entry(absoluteUrl("/blog"), { priority: 0.8 }),
  ];

  const tags = new Set<string>();
  for (const post of posts) {
    entries.push(
      entry(absoluteUrl(`/blog/${post._id}`), {
        lastmod: post.updatedAt ?? post.publishedAt,
        priority: 0.7,
      }),
    );
    for (const tag of post.tags ?? []) tags.add(tag);
  }
  for (const tag of [...tags].sort()) {
    entries.push(entry(absoluteUrl(`/blog/tag/${tag}`), { priority: 0.5 }));
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
