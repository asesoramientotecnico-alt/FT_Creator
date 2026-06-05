import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/familias/[slug]/validar — pasa la familia a 'validada' con registro de usuario.
// Gate: al menos una serie vinculada y sin pendientes abiertos.
export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { data: familia } = await sb.from("familias").select("id").eq("slug", slug).maybeSingle();
  if (!familia) return NextResponse.json({ error: "familia no encontrada" }, { status: 404 });

  const { count: nSeries } = await sb
    .from("ficha_series").select("id", { count: "exact", head: true }).eq("familia_id", familia.id);
  if (!nSeries) {
    return NextResponse.json({ error: "Vinculá al menos una serie dimensional antes de validar." }, { status: 409 });
  }

  const { count: nPend } = await sb
    .from("pendientes").select("id", { count: "exact", head: true })
    .eq("familia_id", familia.id).eq("resuelto", false);
  if (nPend && nPend > 0) {
    return NextResponse.json({ error: `Hay ${nPend} pendiente(s) sin resolver.` }, { status: 409 });
  }

  const { error } = await sb
    .from("familias")
    .update({ estado: "validada", validada_por: user.id, validada_en: new Date().toISOString() })
    .eq("id", familia.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/familias/[slug]/validar — volver a borrador (para corregir).
export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { error } = await sb
    .from("familias")
    .update({ estado: "borrador", validada_por: null, validada_en: null })
    .eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
