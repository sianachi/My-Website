# syntax=docker/dockerfile:1.7

# Build stage: Bun installs dependencies and runs `next build`. The Next CLI
# runs fine under Bun; only the runtime is pinned to Node.
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# Pages are all dynamically rendered, so the build needs no database access.
RUN bun run build

# Runtime stage: Node serves the self-contained standalone server.
# `output: "standalone"` (next.config.ts) emits server.js plus a traced,
# minimal node_modules — no full install needed here.
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
