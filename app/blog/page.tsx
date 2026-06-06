import type { Metadata } from "next";
import { BlogIndex } from "@/screens/blog/BlogIndex";
import { JsonLd } from "@/components/JsonLd";
import { getPublishedPosts } from "@/server/blog";
import {
  BLOG_INDEX_DESCRIPTION,
  BLOG_INDEX_TITLE,
  SITE_NAME,
  absoluteUrl,
} from "@/server/seo";

// Server-rendered per request — posts come from MongoDB.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: BLOG_INDEX_TITLE },
  description: BLOG_INDEX_DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: BLOG_INDEX_TITLE,
    description: BLOG_INDEX_DESCRIPTION,
    type: "website",
    url: absoluteUrl("/blog"),
  },
  twitter: {
    card: "summary_large_image",
    title: BLOG_INDEX_TITLE,
    description: BLOG_INDEX_DESCRIPTION,
  },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: BLOG_INDEX_TITLE,
    url: absoluteUrl("/blog"),
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
      <BlogIndex initialPosts={posts} />
    </>
  );
}
