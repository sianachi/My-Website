import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build for the k3s Docker image — see deployment/Dockerfile.
  output: "standalone",
  // Uploads are served straight from MinIO; skip the Next image optimizer.
  images: { unoptimized: true },
  // jsdom + Shiki theme/lang JSON are loaded at runtime by the markdown
  // renderer; make sure file tracing pulls them into .next/standalone.
  outputFileTracingIncludes: {
    "/blog/**": ["./node_modules/shiki/**", "./node_modules/jsdom/**"],
    "/feed.xml": ["./node_modules/shiki/**", "./node_modules/jsdom/**"],
  },
};

export default nextConfig;
