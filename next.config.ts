import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep static generation within the hosting runner's thread limit.
  experimental: { cpus: 1 },
};

export default nextConfig;
