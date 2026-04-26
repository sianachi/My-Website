import { Router } from "express";
import { presignPutUrl, publicUrl } from "../../lib/s3.js";
import { requireAdmin } from "../../lib/session.js";

const CV_KEY = "cv/current.pdf";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPE = "application/pdf";

export const adminCvRouter = Router();

adminCvRouter.post("/upload-token", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const body = (req.body ?? {}) as {
    contentType?: unknown;
    contentLength?: unknown;
  };

  if (body.contentType !== ALLOWED_TYPE) {
    res.status(400).json({ error: `contentType must be ${ALLOWED_TYPE}` });
    return;
  }
  if (
    typeof body.contentLength !== "number" ||
    !Number.isFinite(body.contentLength) ||
    body.contentLength <= 0 ||
    body.contentLength > MAX_BYTES
  ) {
    res
      .status(400)
      .json({ error: `contentLength must be 1..${MAX_BYTES} bytes` });
    return;
  }

  try {
    const uploadUrl = await presignPutUrl(CV_KEY, ALLOWED_TYPE, 60);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      uploadUrl,
      publicUrl: publicUrl(CV_KEY),
      key: CV_KEY,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});
