import { baseUrl, renderPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = `${baseUrl()}/familias/${encodeURIComponent(slug)}?print=1`;
  return renderPdf({ url, filename: `${slug}.pdf`, cookieHeader: req.headers.get("cookie") ?? "" });
}
