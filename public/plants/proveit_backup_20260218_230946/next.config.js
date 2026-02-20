/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: '**' }],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Avoid "Array buffer allocation failed" from webpack pack cache (dev only)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
