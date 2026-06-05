import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
};

export default config;
