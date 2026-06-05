import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// PATCH /api/tablas-normativas/[id] — guardar ediciones del borrador.
// Solo permitido en estado 'borrador'.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    nombre?: string; descripcion?: string | null;
    columnas?: unknown; filas?: unknown; notas_extraccion?: unknown;
  };

  const { data: actual, error: eGet } = await sb
    .from("tablas_normativas")
    .select("estado")
    .eq("id", id)
    .maybeSingle();
  if (eGet || !actual) return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  if (actual.estado === "validada") {
    return NextResponse.json(
      { error: "tabla validada: re-extraer crea un registro nuevo" },
      { status: 409 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.nombre !== undefined) patch.nombre = body.nombre;
  if (body.descripcion !== undefined) patch.descripcion = body.descripcion;
  if (body.columnas !== undefined) patch.columnas = body.columnas;
  if (body.filas !== undefined) patch.filas = body.filas;
  if (body.notas_extraccion !== undefined) patch.notas_extraccion = body.notas_extraccion;

  const { error: eUpd } = await sb.from("tablas_normativas").update(patch).eq("id", id);
  if (eUpd) return NextResponse.json({ error: eUpd.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
