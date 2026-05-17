import Link from "next/link";

export default function NotFound() {
  return (
    <main className="blog-page">
      <div className="blog-empty">
        <p className="label label-accent">§ 404</p>
        <h1 className="blog-page__title">Page not found.</h1>
        <p>
          That page might have been archived or moved. Try the{" "}
          <Link href="/">home page</Link> or the{" "}
          <Link href="/blog">field notes</Link>.
        </p>
      </div>
    </main>
  );
}
