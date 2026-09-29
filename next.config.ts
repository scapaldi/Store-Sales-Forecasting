import type { NextConfig } from "next";

const pages = process.env.GITHUB_PAGES === "true";
const basePath = pages ? "/Store-Sales-Forecasting" : "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  ...(pages ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
