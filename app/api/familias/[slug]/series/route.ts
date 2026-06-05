import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/familias/[slug]/series — vincula una tabla normativa validada a la familia.
// body: { tabla_normativa_id, sistema, nota?, filas_incluidas? }
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    tabla_normativa_id?: string; sistema?: string; nota?: string; filas_incluidas?: number[];
  };
  if (!b.tabla_normativa_id || !b.sistema) {
    return NextResponse.json({ error: "tabla_normativa_id y sistema requeridos" }, { status: 400 });
  }
  if (!["metrico", "pulgadas"].includes(b.sistema)) {
    return NextResponse.json({ error: "sistema inválido" }, { status: 400 });
  }

  const { data: familia, error: eFam } = await sb
    .from("familias").select("id").eq("slug", slug).maybeSingle();
  if (eFam || !familia) return NextResponse.json({ error: "familia no encontrada" }, { status: 404 });

  // Trazabilidad dura: solo se pueden vincular tablas validadas.
  const { data: tabla, error: eTab } = await sb
    .from("tablas_normativas").select("id, estado").eq("id", b.tabla_normativa_id).maybeSingle();
  if (eTab || !tabla) return NextResponse.json({ error: "tabla no encontrada" }, { status: 404 });
  if (tabla.estado !== "validada") {
    return NextResponse.json({ error: "solo se pueden vincular tablas validadas" }, { status: 409 });
  }

  const { count } = await sb
    .from("ficha_series").select("id", { count: "exact", head: true }).eq("familia_id", familia.id);

  const { data: serie, error } = await sb
    .from("ficha_series")
    .insert({
      familia_id: familia.id,
      tabla_normativa_id: b.tabla_normativa_id,
      sistema: b.sistema,
      nota: b.nota?.trim() || null,
      filas_incluidas: b.filas_incluidas ?? null,
      orden: count ?? 0,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: serie.id });
}
