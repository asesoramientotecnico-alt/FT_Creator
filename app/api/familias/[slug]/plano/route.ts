import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/familias/[slug]/plano — devuelve signed upload URL para subir el plano
// y la URL pública final (bucket 'planos' es público).
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { filename } = (await req.json().catch(() => ({}))) as { filename?: string };
  if (!filename) return NextResponse.json({ error: "filename requerido" }, { status: 400 });

  const safe = filename.replace(/[^\w.\-]+/g, "_");
  const path = `${slug}/${Date.now()}_${safe}`;

  const { data: signed, error } = await sb.storage.from("planos").createSignedUploadUrl(path);
  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? "no se pudo firmar" }, { status: 500 });
  }

  const { data: pub } = sb.storage.from("planos").getPublicUrl(path);
  return NextResponse.json({ upload: signed, publicUrl: pub.publicUrl });
}
