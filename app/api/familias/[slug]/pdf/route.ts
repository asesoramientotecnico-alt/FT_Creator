import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function getBrowser() {
  const puppeteer = await import("puppeteer-core");
  const fs = await import("node:fs");

  // 1) Chrome del sistema si CHROME_PATH o ruta estándar existe (dev local rápido).
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean) as string[];
  const systemPath = candidates.find((p) => {
    try { return fs.statSync(p).isFile(); } catch { return false; }
  });
  if (systemPath) {
    return puppeteer.launch({ executablePath: systemPath, headless: true, args: ["--no-sandbox"] });
  }

  // 2) Chromium serverless (Vercel y fallback local): descarga el pack desde CHROMIUM_PACK_URL.
  const chromium = (await import("@sparticuz/chromium-min")).default;
  const pack = process.env.CHROMIUM_PACK_URL;
  if (!pack) {
    throw new Error(
      "PDF: definí CHROME_PATH (Chrome local) o CHROMIUM_PACK_URL (pack de @sparticuz/chromium-min)."
    );
  }
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(pack),
    headless: true,
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const url = `${baseUrl()}/familias/${encodeURIComponent(slug)}?print=1`;

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${slug}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
