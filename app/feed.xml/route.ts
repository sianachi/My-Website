import { getBlogPostsCollection } from "@/server/lib/mongo";
import { getObjectAsString } from "@/server/lib/s3";
import { renderPost } from "@/server/lib/markdown";
import { absoluteUrl, cdataSafe, escapeXml, siteUrl } from "@/server/seo";
import { blogContentKey } from "@/shared/data/blog";

// Generated per request from MongoDB + S3 — never prerendered at build time.
export const dynamic = "force-dynamic";

const FEED_AUTHOR = "Osinachi Nwagboso";
const FEED_TITLE = "Field notes — Osinachi Nwagboso";
const FEED_SUBTITLE =
  "Writing on backend systems, edge infrastructure, and engineering practice.";
const FEED_MAX_ENTRIES = 30;

type AtomEntry = {
  id: string;
  link: string;
  title: string;
  published?: string;
  updated?: string;
  summary?: string;
  contentHtml: string;
  tags: readonly string[];
};

export async function GET(): Promise<Response> {
  const collection = await getBlogPostsCollection();
  const docs = await collection
    .find({ status: "published" })
    .sort({ publishedAt: -1 })
    .limit(FEED_MAX_ENTRIES)
    .toArray();

  const feedUrl = absoluteUrl("/feed.xml");
  const siteHome = siteUrl();
  const updated =
    docs[0]?.updatedAt ?? docs[0]?.publishedAt ?? new Date().toISOString();

  const entries: AtomEntry[] = await Promise.all(
    docs.map(async (doc) => {
      const md = await getObjectAsString(
        doc.s3ContentKey ?? blogContentKey(doc._id),
      );
      const html = md ? (await renderPost(md)).html : "";
      const link = absoluteUrl(`/blog/${doc._id}`);
      return {
        id: link,
        link,
        title: doc.title,
        published: doc.publishedAt ?? doc.updatedAt,
        updated: doc.updatedAt ?? doc.publishedAt,
        summary: doc.excerpt ?? "",
        contentHtml: html,
        tags: doc.tags ?? [],
      };
    }),
  );

  const body = renderAtom({
    feedUrl,
    siteHome,
    title: FEED_TITLE,
    subtitle: FEED_SUBTITLE,
    author: FEED_AUTHOR,
    updated,
    entries,
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function renderAtom(feed: {
  feedUrl: string;
  siteHome: string;
  title: string;
  subtitle: string;
  author: string;
  updated: string;
  entries: AtomEntry[];
}): string {
  const entries = feed.entries
    .map((e) => {
      const cats = e.tags
        .map((t) => `    <category term="${escapeXml(t)}" />`)
        .join("\n");
      const parts = [
        `    <id>${escapeXml(e.id)}</id>`,
        `    <title>${escapeXml(e.title)}</title>`,
        `    <link rel="alternate" type="text/html" href="${escapeXml(e.link)}" />`,
      ];
      if (e.published)
        parts.push(`    <published>${escapeXml(e.published)}</published>`);
      if (e.updated)
        parts.push(`    <updated>${escapeXml(e.updated)}</updated>`);
      if (cats) parts.push(cats);
      if (e.summary)
        parts.push(`    <summary>${escapeXml(e.summary)}</summary>`);
      parts.push(
        `    <content type="html"><![CDATA[${cdataSafe(e.contentHtml)}]]></content>`,
      );
      return `  <entry>\n${parts.join("\n")}\n  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(feed.feedUrl)}</id>
  <title>${escapeXml(feed.title)}</title>
  <subtitle>${escapeXml(feed.subtitle)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(feed.feedUrl)}" />
  <link rel="alternate" type="text/html" href="${escapeXml(feed.siteHome)}/blog" />
  <updated>${escapeXml(feed.updated)}</updated>
  <author>
    <name>${escapeXml(feed.author)}</name>
    <uri>${escapeXml(feed.siteHome)}</uri>
  </author>
${entries}
</feed>
`;
}
