import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'bcryptjs'],
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
