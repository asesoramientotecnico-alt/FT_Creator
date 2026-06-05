import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TIPOS = ["idioma", "faltante", "discrepancia", "extraccion"];

// POST /api/familias/[slug]/pendientes — crear un pendiente.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { tipo?: string; detalle?: string };
  if (!b.tipo || !TIPOS.includes(b.tipo)) return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  if (!b.detalle?.trim()) return NextResponse.json({ error: "detalle requerido" }, { status: 400 });

  const { data: familia } = await sb.from("familias").select("id").eq("slug", slug).maybeSingle();
  if (!familia) return NextResponse.json({ error: "familia no encontrada" }, { status: 404 });

  const { data: p, error } = await sb
    .from("pendientes")
    .insert({ familia_id: familia.id, tipo: b.tipo, detalle: b.detalle.trim() })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: p.id });
}
