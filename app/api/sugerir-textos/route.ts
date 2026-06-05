import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/sugerir-textos
// body: { slug }
// Devuelve un borrador de descripción + aplicaciones en castellano. Los términos
// habituales en inglés se devuelven como pendientes de tipo 'idioma' (decisión humana).
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });

  const { data: f } = await sb
    .from("familias")
    .select("categoria_nombre, subcategoria_nombre, nombre_en, materiales, rango_comercial, presentacion")
    .eq("slug", slug)
    .maybeSingle();
  if (!f) return NextResponse.json({ error: "familia no encontrada" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const client = new Anthropic({ apiKey });

  const system = `Sos redactor técnico de un catálogo de bulonería inoxidable (FAMIQ), en castellano rioplatense (es-AR).

REGLAS:
- Descripción: 2–3 oraciones, técnica y sobria. Sin marketing exagerado.
- Aplicaciones: 4–8 ítems cortos (sustantivos/usos), no oraciones largas.
- Todo en castellano. Si un término de uso habitual en inglés es relevante como subtítulo o nombre comercial, NO lo decidas vos: agregalo a "pendientes_idioma" con el término y una sugerencia de traducción.
- Devolvé SOLO JSON válido, sin markdown:
{ "descripcion": string, "aplicaciones": string[], "pendientes_idioma": [{ "termino": string, "sugerencia": string }] }`;

  const userText = `Familia:
- Categoría: ${f.categoria_nombre ?? "—"}
- Subcategoría: ${f.subcategoria_nombre ?? "—"}
- Nombre en inglés (si lo hay): ${f.nombre_en ?? "—"}
- Materiales: ${f.materiales ?? "—"}
- Rango comercial: ${f.rango_comercial ?? "—"}
- Presentación: ${f.presentacion ?? "—"}

Redactá descripción y aplicaciones.`;

  const resp = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userText }],
  });

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text).join("\n").trim();
  const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: { descripcion: string; aplicaciones: string[]; pendientes_idioma?: { termino: string; sugerencia: string }[] };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return NextResponse.json({ error: "Claude no devolvió JSON válido", raw: text.slice(0, 1500) }, { status: 502 });
  }

  return NextResponse.json({
    descripcion: parsed.descripcion ?? "",
    aplicaciones: parsed.aplicaciones ?? [],
    pendientes_idioma: parsed.pendientes_idioma ?? [],
  });
}
