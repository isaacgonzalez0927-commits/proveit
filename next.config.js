/** @type {import('next').NextConfig} */
const nextConfig = {
  // transformers.js is ESM-heavy and includes `import.meta`; transpile it so Next/webpack
  // can parse it correctly during production builds (Vercel deploys).
  transpilePackages: ["@huggingface/transformers", "@xenova/transformers"],
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
