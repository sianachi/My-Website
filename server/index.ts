import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentRouter } from "./routes/content.js";
import { blogRouter } from "./routes/blog.js";
import { cvRouter } from "./routes/cv.js";
import { adminRouter } from "./routes/admin/index.js";

const PORT = Number(process.env.PORT ?? 3001);
const SERVE_STATIC = process.env.SERVE_STATIC === "true"
  || process.env.NODE_ENV === "production";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const api = express.Router();
api.use("/", contentRouter);
api.use("/blog", blogRouter);
api.use("/cv", cvRouter);
api.use("/admin", adminRouter);

app.use("/api", api);

if (SERVE_STATIC) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(here, "..", "dist");
  const indexHtml = path.join(dist, "index.html");
  app.use(express.static(dist, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(indexHtml);
  });
}

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[api] ${msg}`);
    if (res.headersSent) return;
    res.status(500).json({ error: msg });
  },
);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
