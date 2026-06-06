import { useEffect, useState } from "react";
import { blogApi } from "@/lib/blogApi";
import type { BlogPostListItem } from "@/shared/data/blog";

type Props = {
  slug: string;
  navigate: (to: string) => void;
};

export function BlogRelated({ slug, navigate }: Props) {
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    blogApi
      .related(slug, ac.signal)
      .then((p) => setPosts(p))
      .catch(() => {});
    return () => ac.abort();
  }, [slug]);

  if (posts.length === 0) return null;

  return (
    <section className="blog-related" aria-label="Related posts">
      <p className="label label-accent">§ More field notes</p>
      <ul className="blog-related__list" role="list">
        {posts.map((post) => (
          <li key={post.slug}>
            <a
              className="blog-related__card"
              href={`/blog/${post.slug}`}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.button !== 0
                )
                  return;
                event.preventDefault();
                navigate(`/blog/${post.slug}`);
              }}
            >
              <h3 className="blog-related__title">{post.title}</h3>
              {post.excerpt && (
                <p className="blog-related__excerpt">{post.excerpt}</p>
              )}
              <p className="blog-related__meta">
                {formatDate(post.publishedAt ?? post.updatedAt)}
                {post.readingMinutes
                  ? ` · ${post.readingMinutes} min read`
                  : ""}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
