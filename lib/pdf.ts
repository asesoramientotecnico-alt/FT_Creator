import { NextResponse } from "next/server";

export function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  // Alias público del proyecto (ej. ft-creator.vercel.app). NO está detrás de Vercel Authentication.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // VERCEL_URL es el hostname del deployment; en previews suele requerir auth y rompería el self-fetch.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function getBrowser() {
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

  // Vercel corre sobre AWS Lambda (AL2023, Node 20/22) pero NO expone AWS_EXECUTION_ENV
  // ni AWS_LAMBDA_JS_RUNTIME. Sin eso, @sparticuz/chromium NO descomprime al2023.tar.br
  // (que contiene libnss3.so y demás libs del sistema) y Chromium falla al arrancar.
  if (!process.env.AWS_EXECUTION_ENV && !process.env.AWS_LAMBDA_JS_RUNTIME) {
    process.env.AWS_LAMBDA_JS_RUNTIME = "nodejs20.x";
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

// Renderiza una URL imprimible de la propia app a PDF. Propaga la cookie de
// sesión para pasar el proxy auth. Devuelve un NextResponse (PDF o JSON de error).
export async function renderPdf(opts: {
  url: string;
  filename: string;
  cookieHeader?: string;
}): Promise<NextResponse> {
  const { url, filename, cookieHeader = "" } = opts;
  try {
    const probe = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (probe.status >= 400) {
      const body = await probe.text().catch(() => "");
      return NextResponse.json(
        {
          error: "self-fetch del HTML imprimible falló",
          url,
          status: probe.status,
          hint: probe.status === 401
            ? "Deployment detrás de Vercel Authentication. Usá el alias público o NEXT_PUBLIC_BASE_URL."
            : undefined,
          body: body.slice(0, 500),
        },
        { status: 500 }
      );
    }

    const browser = await getBrowser();
    try {
      const page = await browser.newPage();
      if (cookieHeader) await page.setExtraHTTPHeaders({ cookie: cookieHeader });
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
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
          "Content-Disposition": `inline; filename="${filename}"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    const e = err as Error;
    console.error("[pdf]", e);
    return NextResponse.json({ error: e.message ?? "unknown", name: e.name, url }, { status: 500 });
  }
}
