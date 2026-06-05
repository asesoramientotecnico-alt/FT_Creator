import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

// POST /api/familias — alta de familia (datos comerciales). Estado inicial 'borrador'.
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const subcategoria_nombre = (b.subcategoria_nombre as string)?.trim();
  if (!subcategoria_nombre) {
    return NextResponse.json({ error: "subcategoria_nombre es requerido" }, { status: 400 });
  }

  // Slug a partir del nombre de subcategoría; aseguramos unicidad con sufijo numérico.
  const base = slugify(subcategoria_nombre) || "familia";
  let slug = base;
  for (let i = 2; ; i++) {
    const { data: exists } = await sb.from("familias").select("id").eq("slug", slug).maybeSingle();
    if (!exists) break;
    slug = `${base}-${i}`;
  }

  const insert = {
    slug,
    categoria_num: b.categoria_num != null && b.categoria_num !== "" ? Number(b.categoria_num) : null,
    categoria_nombre: (b.categoria_nombre as string)?.trim() || null,
    subcategoria_num: (b.subcategoria_num as string)?.trim() || null,
    subcategoria_nombre,
    nombre_en: (b.nombre_en as string)?.trim() || null,
    materiales: (b.materiales as string)?.trim() || null,
    rango_comercial: (b.rango_comercial as string)?.trim() || null,
    presentacion: (b.presentacion as string)?.trim() || null,
    estado: "borrador" as const,
  };

  const { data: familia, error } = await sb
    .from("familias")
    .insert(insert)
    .select("slug")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ slug: familia.slug });
}
