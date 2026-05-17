import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogTag } from "@/screens/blog/BlogTag";
import { JsonLd } from "@/components/JsonLd";
import { getPublishedPosts } from "@/server/blog";
import { BlogTagSchema } from "@/shared/data/blog";
import { SITE_NAME, absoluteUrl } from "@/server/seo";

// Server-rendered per request — posts come from MongoDB.
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ tag: string }> };

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { tag } = await params;
  const parsed = BlogTagSchema.safeParse(tag);
  if (!parsed.success) return {};
  const title = `Posts tagged "${parsed.data}"`;
  const description = `Field-notes posts tagged ${parsed.data}.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/blog/tag/${parsed.data}`) },
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/blog/tag/${parsed.data}`),
    },
  };
}

export default async function BlogTagPage({ params }: RouteParams) {
  const { tag } = await params;
  const parsed = BlogTagSchema.safeParse(tag);
  if (!parsed.success) notFound();
  const posts = await getPublishedPosts(parsed.data);

  const title = `Posts tagged "${parsed.data}" — ${SITE_NAME}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: title,
    url: absoluteUrl(`/blog/tag/${parsed.data}`),
    author: { "@type": "Person", name: SITE_NAME },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: absoluteUrl(`/blog/${p.slug}`),
      datePublished: p.publishedAt,
      dateModified: p.updatedAt,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <BlogTag tag={parsed.data} initialPosts={posts} />
    </>
  );
}
