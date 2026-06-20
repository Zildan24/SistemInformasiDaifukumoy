import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/reseller/riwayat-po',
        destination: '/reseller/history',
        permanent: true,
      },
    ];
  }
};

export default nextConfig;