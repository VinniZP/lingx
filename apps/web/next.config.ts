import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This bundles all necessary dependencies for self-contained deployment
  output: "standalone",
};

export default nextConfig;
