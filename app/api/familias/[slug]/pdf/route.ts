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
  const isVercel = !!process.env.VERCEL;
  if (isVercel) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const puppeteer = await import("puppeteer-core");
    const pack = process.env.CHROMIUM_PACK_URL!;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(pack),
      headless: true,
    });
  }
  // Local: usar Chrome/Chromium del sistema si existe.
  const puppeteer = await import("puppeteer-core");
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean) as string[];
  const fs = await import("node:fs");
  const executablePath = candidates.find((p) => {
    try { return fs.statSync(p).isFile(); } catch { return false; }
  });
  if (!executablePath) {
    throw new Error(
      "No se encontró Chromium local. Definí CHROME_PATH en .env.local o ejecutá en Vercel."
    );
  }
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
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
