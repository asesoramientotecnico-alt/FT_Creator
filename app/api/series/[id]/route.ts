import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// PATCH /api/series/[id] — actualizar nota / filas_incluidas / orden de una serie.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    nota?: string | null; filas_incluidas?: number[] | null; orden?: number;
  };
  const patch: Record<string, unknown> = {};
  if (b.nota !== undefined) patch.nota = b.nota === "" ? null : b.nota;
  if (b.filas_incluidas !== undefined) patch.filas_incluidas = b.filas_incluidas;
  if (b.orden !== undefined) patch.orden = b.orden;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }

  const { error } = await sb.from("ficha_series").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/series/[id] — desvincular una serie.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { error } = await sb.from("ficha_series").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
