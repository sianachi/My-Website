import { Router } from "express";
import { objectExists, publicUrl } from "../lib/s3.js";

const CV_KEY = "cv/current.pdf";

export const cvRouter = Router();

cvRouter.get("/", async (_req, res) => {
  try {
    const exists = await objectExists(CV_KEY);
    if (!exists) {
      res.status(404).json({ message: "CV not uploaded yet" });
      return;
    }
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    res.redirect(302, publicUrl(CV_KEY));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: msg });
  }
});
