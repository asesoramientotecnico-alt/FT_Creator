import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Campos editables de datos generales + textos. (Series y plano tienen sus propios endpoints.)
const CAMPOS_EDITABLES = new Set([
  "categoria_num",
  "categoria_nombre",
  "subcategoria_num",
  "subcategoria_nombre",
  "nombre_en",
  "materiales",
  "rango_comercial",
  "presentacion",
  "descripcion",
  "descripcion_origen",
  "aplicaciones",
  "svg_path",
  "svg_origen",
]);

// PATCH /api/familias/[slug] — actualizar datos generales / textos.
export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b)) {
    if (!CAMPOS_EDITABLES.has(k)) continue;
    if (k === "categoria_num") patch[k] = v != null && v !== "" ? Number(v) : null;
    else patch[k] = v === "" ? null : v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }

  const { error } = await sb.from("familias").update(patch).eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
