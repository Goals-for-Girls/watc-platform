import type { NextConfig } from "next";

// Pages are still pre-rendered as static HTML at build time, so they load
// fast on weak connections. Only /api/bot runs on the server, because it
// holds the AI key and must never run in the browser.
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
