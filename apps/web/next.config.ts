import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const distDir = process.env.MINANCE_NEXT_DIST_DIR || ".next";
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  distDir,
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot
  }
};

export default nextConfig;
