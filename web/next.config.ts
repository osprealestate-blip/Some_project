import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/about", destination: "/how-it-works", permanent: true }];
  },
};

export default nextConfig;
