import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      // non-www → www 리다이렉트 (canonical 통일)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'mk-land.kr' }],
        destination: 'https://www.mk-land.kr/:path*',
        permanent: true,
      },
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
      {
        source: '/blog/dsr-calculation-guide',
        destination: '/blog/dsr-ratio-loan-limit-strategy',
        permanent: true,
      },
      {
        source: '/blog/apartment-management-fee-guide',
        destination: '/blog/apartment-management-fee-saving-tips',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
