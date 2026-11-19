import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The image optimizer makes internal requests without the access cookie.
  images: { unoptimized: true },
  // Keep static generation within the hosting runner's thread limit.
  experimental: { cpus: 1 },
};

export default nextConfig;
