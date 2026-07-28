import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is served from
// https://<user>.github.io/prep-pantry/, hence the basePath in production.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NODE_ENV === "production" ? "/prep-pantry" : "",
  images: { unoptimized: true },
};

export default nextConfig;
