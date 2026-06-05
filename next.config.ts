import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Next no traza los .br del paquete vía require estático; los incluimos a mano.
  outputFileTracingIncludes: {
    "/api/familias/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default config;
