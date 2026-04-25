import { Router } from "express";
import { head } from "@vercel/blob";

const CV_PATH = "cv/current.pdf";

export const cvRouter = Router();

cvRouter.get("/", async (_req, res) => {
  try {
    const blob = await head(CV_PATH);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    res.redirect(302, blob.url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found|404/i.test(msg)) {
      res.status(404).json({ message: "CV not uploaded yet" });
      return;
    }
    res.status(500).json({ message: msg });
  }
});
