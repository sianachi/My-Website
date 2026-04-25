import { Router, type Request } from "express";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "../../lib/session.js";

const CV_PATH = "cv/current.pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export const adminCvRouter = Router();

adminCvRouter.post("/upload-token", async (req, res) => {
  const body = (req.body ?? {}) as HandleUploadBody;

  // Two body shapes hit this endpoint: a token request from the browser, and
  // an upload-completion webhook from Vercel Blob. Only gate the first on
  // requireAdmin — the webhook is authenticated by Blob's own signature
  // verification inside handleUpload.
  if (body.type !== "blob.upload-completed") {
    const session = await requireAdmin(req, res);
    if (!session) return;
  }

  try {
    const result = await handleUpload({
      body,
      request: toRequest(req),
      onBeforeGenerateToken: async (pathname) => {
        if (pathname !== CV_PATH) {
          throw new Error(`pathname must be ${CV_PATH}`);
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: /api/cv always reads the current blob at CV_PATH.
      },
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

function toRequest(req: Request): globalThis.Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.originalUrl ?? "/"}`;
  return new globalThis.Request(url, {
    method: req.method ?? "POST",
    headers,
  });
}
