import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  // Alias público del proyecto (ej. ft-creator.vercel.app). NO está detrás de Vercel Authentication.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // VERCEL_URL es el hostname del deployment; en previews suele requerir auth y rompería el self-fetch.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function getBrowser() {
  const puppeteer = await import("puppeteer-core");
  const fs = await import("node:fs");

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

  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const url = `${baseUrl()}/familias/${encodeURIComponent(slug)}?print=1`;

  try {
    // Sanity check del self-fetch antes de levantar Chromium: si la URL devuelve 401/404/5xx,
    // queremos ver eso como JSON, no perder 30s en networkidle0 y devolver 500 opaco.
    const probe = await fetch(url, { method: "GET", redirect: "manual" });
    if (probe.status >= 400) {
      const body = await probe.text().catch(() => "");
      return NextResponse.json(
        {
          error: "self-fetch del HTML imprimible falló",
          url,
          status: probe.status,
          hint:
            probe.status === 401
              ? "El deployment está detrás de Vercel Authentication. Usá el alias público o definí NEXT_PUBLIC_BASE_URL."
              : undefined,
          body: body.slice(0, 500),
        },
        { status: 500 }
      );
    }

    const browser = await getBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle0", timeout: 45_000 });
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
  } catch (err) {
    const e = err as Error;
    console.error("[pdf]", e);
    return NextResponse.json(
      { error: e.message ?? "unknown", name: e.name, url },
      { status: 500 }
    );
  }
}
