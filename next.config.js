
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    appDir: true,
  },
  serverRuntimeConfig: {
    PORT: 3004,
  },
};

module.exports = nextConfig;
