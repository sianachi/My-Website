# syntax=docker/dockerfile:1.7

# Build stage: install all deps and build the SPA.
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime stage: production deps + built artifacts only.
FROM oven/bun:1-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/shared ./src/shared
COPY src/content ./src/content

EXPOSE 3001
CMD ["bun", "run", "server/index.ts"]
