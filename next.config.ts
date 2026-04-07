import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      {
        source: '/apt/acquisition-tax-guide-2025',
        destination: '/apt/acquisition-tax-guide',
        permanent: true,
      },
      {
        source: '/apt/mortgage-loan-complete-guide-2025',
        destination: '/apt/mortgage-loan-complete-guide',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
