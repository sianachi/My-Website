import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Serves `api/*.ts` files during `vite dev` the same way Vercel serves
 * them in production — map `/api/<file>` to `api/<file>.ts`, load via
 * Vite's SSR module graph, and call the default export with adapted
 * VercelRequest / VercelResponse objects.
 */
function apiPlugin(): Plugin {
  return {
    name: "local-vercel-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const pathname = req.url.split("?")[0];
        const modulePath = `/${pathname.replace(/^\//, "")}.ts`; // "/api/contact.ts"

        try {
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: `${modulePath} has no default export` }));
            return;
          }

          const body = await readBody(req);
          const vReq = adaptRequest(req, body);
          const vRes = adaptResponse(res);
          await handler(vReq, vRes);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/Failed to load url|Cannot find module|ENOENT/i.test(msg)) {
            return next();
          }
          server.config.logger.error(`[api] ${msg}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: msg }));
          }
        }
      });
    },
  };
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(undefined);
      const ct = String(req.headers["content-type"] ?? "").toLowerCase();
      if (ct.includes("application/json")) {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      } else {
        resolve(raw);
      }
    });
    req.on("error", reject);
  });
}

function adaptRequest(req: IncomingMessage, body: unknown) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const query: Record<string, string | string[]> = {};
  for (const [k, v] of url.searchParams) {
    const prev = query[k];
    if (prev === undefined) query[k] = v;
    else query[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return Object.assign(req, { query, body, cookies: {} });
}

function adaptResponse(res: ServerResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vRes = res as any;
  vRes.status = (code: number) => {
    res.statusCode = code;
    return vRes;
  };
  vRes.json = (data: unknown) => {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(data));
    return vRes;
  };
  vRes.send = (body: unknown) => {
    if (body !== null && typeof body === "object") return vRes.json(body);
    res.end(body == null ? "" : String(body));
    return vRes;
  };
  vRes.redirect = (...args: [number, string] | [string]) => {
    const status = typeof args[0] === "number" ? args[0] : 302;
    const loc = typeof args[0] === "string" ? args[0] : (args[1] as string);
    res.statusCode = status;
    res.setHeader("Location", loc);
    res.end();
    return vRes;
  };
  return vRes;
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
