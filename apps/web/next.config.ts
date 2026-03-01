import type { NextConfig } from "next";

const apiOrigin = process.env.MINANCE_API_ORIGIN || "http://127.0.0.1:3001";
const distDir = process.env.MINANCE_NEXT_DIST_DIR || ".next";

const nextConfig: NextConfig = {
  distDir,
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${apiOrigin}/v1/:path*`
      }
    ];
  }
};

export default nextConfig;
