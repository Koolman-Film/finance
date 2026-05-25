/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Keep puppeteer-core + sparticuz/chromium-min out of Next's webpack bundle.
  // They're pure node deps with heavy runtime/binary requirements; bundling
  // them breaks dynamic requires and triples the function size.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
};

export default nextConfig;
