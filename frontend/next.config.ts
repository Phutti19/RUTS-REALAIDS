import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Prevent Next.js from selecting the monorepo root as the workspace root
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "iot666.ddns.net",
      },
    ],
  },
};

export default nextConfig;
