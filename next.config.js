/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep HF out of server bundles / tracing (cannot combine with transpilePackages for same pkg).
  serverExternalPackages: ["@huggingface/transformers"],
  // Prevent @vercel/nft from copying huge WASM deps into every serverless trace (Vercel 200–250 MB cap).
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/@huggingface/transformers/**/*",
      "./node_modules/onnxruntime-web/**/*",
    ],
  },
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
