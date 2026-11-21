import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    workerThreads: false,
  },
  // تعطيل تحسين الصور غير الضرورية للبناء الثابت
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
