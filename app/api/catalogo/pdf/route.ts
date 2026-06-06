import { NextResponse } from "next/server";
import { baseUrl, renderPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// GET /api/catalogo/pdf?slugs=a,b,c — catálogo unificado (portada + índice + fichas).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slugs = (searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (slugs.length === 0) {
    return NextResponse.json({ error: "pasá ?slugs=a,b,c" }, { status: 400 });
  }
  const url = `${baseUrl()}/catalogo/imprimir?slugs=${encodeURIComponent(slugs.join(","))}`;
  return renderPdf({ url, filename: "catalogo-famiq.pdf", cookieHeader: req.headers.get("cookie") ?? "" });
}
