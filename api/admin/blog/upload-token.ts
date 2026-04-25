import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "../../_lib/session.js";

const PATH_PREFIX = "blog/images/";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const body = (req.body ?? {}) as HandleUploadBody;

  // Two body shapes hit this endpoint: a token request from the browser, and
  // an upload-completion webhook from Vercel Blob. Only gate the first on
  // requireAdmin — the webhook is authenticated by Blob's own signature.
  if (body.type !== "blob.upload-completed") {
    const session = await requireAdmin(req, res);
    if (!session) return;
  }

  try {
    const result = await handleUpload({
      body,
      request: toRequest(req),
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(PATH_PREFIX)) {
          throw new Error(`pathname must start with ${PATH_PREFIX}`);
        }
        // Uniqueness is enforced client-side via a timestamp prefix
        // in the pathname, so server-side suffixing is unnecessary.
        // allowOverwrite mirrors the CV uploader and avoids 400s from
        // the Blob API when a path collides on retry.
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: blog posts reference uploaded URLs directly via markdown.
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }
}

function toRequest(req: VercelRequest): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;
  return new Request(url, { method: req.method ?? "POST", headers });
}
