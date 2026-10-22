import type { NextConfig } from "next";

// Static export: every page is plain HTML, so the site loads fast on weak
// connections and can be hosted for free. Dynamic features (logins, the coach
// portal) will move to server rendering in a later phase.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
