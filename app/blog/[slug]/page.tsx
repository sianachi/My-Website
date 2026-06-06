import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPost } from "@/screens/blog/BlogPost";
import { JsonLd } from "@/components/JsonLd";
import { getPost } from "@/server/blog";
import { BlogSlugSchema } from "@/shared/data/blog";
import {
  BLOG_INDEX_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  siteUrl,
} from "@/server/seo";

// Server-rendered per request — post body comes from MongoDB + S3.
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  if (!BlogSlugSchema.safeParse(slug).success) return {};
  const post = await getPost(slug);
  if (!post) return {};

  const description =
    (post.excerpt && post.excerpt.trim()) || BLOG_INDEX_DESCRIPTION;
  const canonical = absoluteUrl(`/blog/${slug}`);
  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: canonical,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: RouteParams) {
  const { slug } = await params;
  if (!BlogSlugSchema.safeParse(slug).success) notFound();
  const post = await getPost(slug);
  if (!post) notFound();

  const canonical = absoluteUrl(`/blog/${slug}`);
  const description =
    (post.excerpt && post.excerpt.trim()) || BLOG_INDEX_DESCRIPTION;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: SITE_NAME, url: siteUrl() },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    url: canonical,
    ...(post.coverImage ? { image: post.coverImage } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <BlogPost slug={slug} initialPost={post} />
    </>
  );
}
