import { useEffect, useState } from "react";
import { blogApi, type BlogNeighbors } from "@/lib/blogApi";

type Props = {
  slug: string;
  navigate: (to: string) => void;
};

export function BlogPostNav({ slug, navigate }: Props) {
  const [data, setData] = useState<BlogNeighbors | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    blogApi
      .neighbors(slug, ac.signal)
      .then((d) => setData(d))
      .catch(() => {});
    return () => ac.abort();
  }, [slug]);

  if (!data || (!data.prev && !data.next)) return null;

  return (
    <nav className="blog-post-nav" aria-label="More posts">
      {data.prev ? (
        <a
          className="blog-post-nav__cell blog-post-nav__cell--prev"
          href={`/blog/${data.prev.slug}`}
          onClick={(e) => onLinkClick(e, navigate, `/blog/${data.prev!.slug}`)}
        >
          <span className="blog-post-nav__label">← Older</span>
          <span className="blog-post-nav__title">{data.prev.title}</span>
        </a>
      ) : (
        <span className="blog-post-nav__cell blog-post-nav__cell--empty" />
      )}
      {data.next ? (
        <a
          className="blog-post-nav__cell blog-post-nav__cell--next"
          href={`/blog/${data.next.slug}`}
          onClick={(e) => onLinkClick(e, navigate, `/blog/${data.next!.slug}`)}
        >
          <span className="blog-post-nav__label">Newer →</span>
          <span className="blog-post-nav__title">{data.next.title}</span>
        </a>
      ) : (
        <span className="blog-post-nav__cell blog-post-nav__cell--empty" />
      )}
    </nav>
  );
}

function onLinkClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  navigate: (to: string) => void,
  to: string,
) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
    return;
  }
  event.preventDefault();
  navigate(to);
}
