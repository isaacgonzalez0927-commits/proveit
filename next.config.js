/** @type {import('next').NextConfig} */
const nextConfig = {
  // transformers.js is ESM-heavy and includes `import.meta`; transpile it so Next/webpack
  // can parse it correctly during production builds (Vercel deploys).
  transpilePackages: ["@huggingface/transformers"],
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
    // @huggingface/transformers (browser): avoid bundling Node-only backends (see HF Next.js tutorial).
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

module.exports = nextConfig;
