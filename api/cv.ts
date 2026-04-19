import type { VercelRequest, VercelResponse } from "@vercel/node";
import { head } from "@vercel/blob";

/**
 * Redirect to the current CV stored in Vercel Blob.
 * Upload a new CV with `bun run cv:upload path/to/file.pdf` — it
 * replaces the blob at cv/current.pdf, and this endpoint always
 * points at the latest version.
 */
const CV_PATH = "cv/current.pdf";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const blob = await head(CV_PATH);
    // Short CDN cache so a newly uploaded CV propagates within a minute
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return res.redirect(302, blob.url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found|404/i.test(msg)) {
      return res.status(404).json({ message: "CV not uploaded yet" });
    }
    return res.status(500).json({ message: msg });
  }
}
