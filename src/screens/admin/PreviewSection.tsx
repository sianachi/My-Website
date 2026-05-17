import { useState } from "react";
import { Segment } from "@/components/Segment";

type Viewport = "desktop" | "mobile";

export function PreviewSection() {
  const [reloadKey, setReloadKey] = useState(0);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  return (
    <section
      className="core-card core-card--wide"
      aria-labelledby="core-preview-heading"
    >
      <div className="core-section-head">
        <div>
          <p className="label label-accent core-meta">§ Preview</p>
          <h2
            id="core-preview-heading"
            className="core-heading core-heading--sm"
          >
            Live site.
          </h2>
        </div>
        <div className="core-toolbar">
          <Segment
            value={viewport}
            options={["desktop", "mobile"]}
            onChange={setViewport}
            ariaLabel="Preview viewport"
            renderLabel={(v) => (v === "desktop" ? "Desktop" : "Mobile")}
          />
          <button
            type="button"
            className="core-btn core-btn--ghost"
            onClick={() => setReloadKey((n) => n + 1)}
          >
            Reload
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="core-btn core-btn--ghost"
          >
            Open ↗
          </a>
        </div>
      </div>
      <p className="core-body">
        Reflects what&apos;s saved. Reload after editing to see your changes
        (CDN cache may delay propagation up to an hour).
      </p>
      <div
        className="core-preview-frame"
        data-viewport={viewport}
      >
        <iframe
          key={reloadKey}
          src="/"
          title="Site preview"
          loading="lazy"
        />
      </div>
    </section>
  );
}

