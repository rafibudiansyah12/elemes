import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["framer-motion", "motion-dom", "motion-utils"],
};

export default nextConfig;
