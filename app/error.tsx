"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="site-error" role="alert">
      <div className="label label-accent">§ Couldn&apos;t load content</div>
      <p className="site-error-msg">{error.message}</p>
      <button type="button" className="site-error-retry" onClick={reset}>
        Retry →
      </button>
    </div>
  );
}
