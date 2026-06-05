import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/tablas-normativas/[id]/validar — pasa la tabla de borrador a validada,
// registra usuario y fecha. Solo tablas validadas son seleccionables desde fichas.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { error } = await sb
    .from("tablas_normativas")
    .update({
      estado: "validada",
      validada_por: user.id,
      validada_en: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "borrador");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
