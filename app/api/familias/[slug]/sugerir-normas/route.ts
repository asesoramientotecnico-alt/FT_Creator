import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type NormaSugerida = { codigo: string; titulo: string; motivo: string };
type Categoria = "dimensional_fabricacion" | "pruebas_ensayo";

// Normaliza un código de norma para comparar ("ISO 4762" ~ "iso4762").
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// POST /api/familias/[slug]/sugerir-normas
// Asistente: sugiere las normas aplicables (dimensionales de fabricación y de
// pruebas/ensayo), clasifica las ya vinculadas y reporta cobertura.
export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { data: familia } = await sb
    .from("familias")
    .select("id, categoria_nombre, subcategoria_nombre, nombre_en, materiales, rango_comercial")
    .eq("slug", slug)
    .maybeSingle();
  if (!familia) return NextResponse.json({ error: "familia no encontrada" }, { status: 404 });

  // Normas ya vinculadas (vía series).
  const { data: vinculos } = await sb
    .from("ficha_series")
    .select("tabla:tablas_normativas(norma:normas(codigo, edicion))")
    .eq("familia_id", familia.id);
  const vinculadas = Array.from(
    new Set((vinculos ?? []).map((v: any) => v.tabla?.norma?.codigo).filter(Boolean))
  ) as string[];

  // Biblioteca de normas disponibles + si tienen tabla validada.
  const { data: biblioteca } = await sb
    .from("normas")
    .select("codigo, edicion, tablas_normativas(estado)");
  const dispMap = new Map<string, { tieneValidada: boolean }>();
  for (const n of biblioteca ?? []) {
    const tieneValidada = (n.tablas_normativas ?? []).some((t: any) => t.estado === "validada");
    dispMap.set(norm(n.codigo), { tieneValidada });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
  const client = new Anthropic({ apiKey });

  const system = `Sos un asesor técnico normativo de bulonería inoxidable (FAMIQ). Recomendás qué normas aplican a una familia de bulones.

REGLAS DURAS:
- Distinguí DOS categorías:
  1) "dimensional_fabricacion": normas de DIMENSIONES y FABRICACIÓN de la pieza (geometría, roscas, tolerancias). Ej: ISO 4762, DIN 912, ISO 4032, ISO 261.
  2) "pruebas_ensayo": normas de PROPIEDADES MECÁNICAS y ENSAYOS (resistencia, dureza, par, materiales/clases). Ej: ISO 898-1, ISO 898-2, ISO 3506-1, ISO 3506-2.
- Sugerí SOLO normas reales y bien establecidas (ISO/DIN/ASTM/UNE) pertinentes al tipo de pieza y al material. NO inventes números de norma. Si no estás seguro de un código exacto, no lo incluyas.
- Para acero inoxidable, las clases/propiedades suelen regirse por ISO 3506 (no ISO 898, que es para acero al carbono/aleado). Tenelo en cuenta según el material.
- Clasificá cada una de las "normas_ya_vinculadas" que te paso en una de las categorías o en "otra".
- Todo en castellano. Devolvé SOLO JSON válido, sin markdown:
{
  "dimensional_fabricacion": [{ "codigo": string, "titulo": string, "motivo": string }],
  "pruebas_ensayo": [{ "codigo": string, "titulo": string, "motivo": string }],
  "clasificacion_vinculadas": [{ "codigo": string, "categoria": "dimensional_fabricacion" | "pruebas_ensayo" | "otra" }]
}`;

  const userText = `Familia:
- Categoría: ${familia.categoria_nombre ?? "—"}
- Subcategoría: ${familia.subcategoria_nombre ?? "—"}
- Nombre en inglés: ${familia.nombre_en ?? "—"}
- Materiales: ${familia.materiales ?? "—"}
- Rango comercial: ${familia.rango_comercial ?? "—"}

Normas ya vinculadas a esta familia: ${vinculadas.length ? vinculadas.join(", ") : "(ninguna)"}

Recomendá las normas que deberían ir y clasificá las ya vinculadas.`;

  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: userText }],
  });

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text).join("\n").trim();
  const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: {
    dimensional_fabricacion: NormaSugerida[];
    pruebas_ensayo: NormaSugerida[];
    clasificacion_vinculadas: { codigo: string; categoria: Categoria | "otra" }[];
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return NextResponse.json({ error: "Claude no devolvió JSON válido", raw: text.slice(0, 1500) }, { status: 502 });
  }

  // Enriquecemos cada sugerencia con disponibilidad en la biblioteca.
  const enrich = (arr: NormaSugerida[] = []) =>
    arr.map((n) => {
      const disp = dispMap.get(norm(n.codigo));
      return {
        ...n,
        en_biblioteca: !!disp,
        tabla_validada: disp?.tieneValidada ?? false,
        ya_vinculada: vinculadas.some((v) => norm(v) === norm(n.codigo)),
      };
    });

  // Cobertura: ¿las vinculadas cubren ambas categorías?
  const clas = parsed.clasificacion_vinculadas ?? [];
  const tiene_dimensional = clas.some((c) => c.categoria === "dimensional_fabricacion");
  const tiene_pruebas = clas.some((c) => c.categoria === "pruebas_ensayo");
  const faltan: Categoria[] = [];
  if (!tiene_dimensional) faltan.push("dimensional_fabricacion");
  if (!tiene_pruebas) faltan.push("pruebas_ensayo");

  return NextResponse.json({
    dimensional_fabricacion: enrich(parsed.dimensional_fabricacion),
    pruebas_ensayo: enrich(parsed.pruebas_ensayo),
    clasificacion_vinculadas: clas,
    cobertura: { tiene_dimensional, tiene_pruebas, faltan },
  });
}
