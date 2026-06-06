import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/sugerir-textos
// body: { slug }
// Lee las normas vinculadas a la familia (PDFs de las tablas asociadas) como FUENTE
// PRIMARIA, y le pide a Claude descripción + aplicaciones en castellano basadas en
// lo que efectivamente dice la norma. Si la familia no tiene normas vinculadas,
// no se puede sugerir.
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });

  const { data: familia } = await sb
    .from("familias")
    .select("id, categoria_nombre, subcategoria_nombre, nombre_en, materiales, rango_comercial, presentacion")
    .eq("slug", slug)
    .maybeSingle();
  if (!familia) return NextResponse.json({ error: "familia no encontrada" }, { status: 404 });

  // Normas vinculadas vía ficha_series → tablas_normativas → normas. Deduplicadas.
  const { data: vinculos } = await sb
    .from("ficha_series")
    .select("tabla:tablas_normativas(norma:normas(id, codigo, edicion, pdf_path))")
    .eq("familia_id", familia.id);

  const normasMap = new Map<string, { codigo: string; edicion: string; pdf_path: string | null }>();
  for (const v of vinculos ?? []) {
    const n = (v as any).tabla?.norma;
    if (n?.id && !normasMap.has(n.id)) {
      normasMap.set(n.id, { codigo: n.codigo, edicion: n.edicion, pdf_path: n.pdf_path });
    }
  }
  if (normasMap.size === 0) {
    return NextResponse.json(
      { error: "La familia no tiene normas vinculadas. Vinculá al menos una serie con su tabla normativa antes de sugerir textos." },
      { status: 409 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
  const client = new Anthropic({ apiKey });

  // Descargar y embeber cada PDF como documento. Limitamos a 5 normas para acotar el costo/tokens.
  const docs: Anthropic.ContentBlockParam[] = [];
  const referencias: string[] = [];
  let i = 0;
  for (const n of normasMap.values()) {
    if (i++ >= 5) break;
    if (!n.pdf_path) continue;
    const { data: file } = await sb.storage.from("normas").download(n.pdf_path);
    if (!file) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    docs.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") },
      title: `${n.codigo} (${n.edicion})`,
    } as any);
    referencias.push(`${n.codigo} (${n.edicion})`);
  }

  if (docs.length === 0) {
    return NextResponse.json({ error: "Las normas vinculadas no tienen PDF cargado." }, { status: 409 });
  }

  const system = `Sos redactor técnico de un catálogo de bulonería inoxidable (FAMIQ), en castellano rioplatense (es-AR).

REGLAS DURAS:
- FUENTE PRIMARIA: los PDFs de las normas técnicas adjuntas. Basá la descripción en lo que esas normas DICEN explícitamente (alcance, definiciones, propiedades dimensionales relevantes). NO uses conocimiento general si contradice o agrega lo que la norma no dice.
- Si la norma no menciona algo, no lo afirmes. Si dudás, omitilo.
- Descripción: 2–3 oraciones, técnica y sobria. Sin marketing.
- Aplicaciones: 4–8 ítems cortos (sustantivos/usos), no oraciones largas. Sugerí aplicaciones razonables consistentes con el tipo de bulón descrito en la norma; si la norma no las menciona, deducilas conservadoramente del tipo de pieza.
- IDIOMA: todo en castellano. Si un término técnico habitual en inglés es relevante como subtítulo o nombre comercial (ej. "Hex Nut"), NO lo decidas vos: agregalo a "pendientes_idioma" con sugerencia de traducción.
- Devolvé SOLO JSON válido, sin markdown:
{ "descripcion": string, "aplicaciones": string[], "pendientes_idioma": [{ "termino": string, "sugerencia": string }] }`;

  const userText = `Familia a redactar:
- Categoría: ${familia.categoria_nombre ?? "—"}
- Subcategoría: ${familia.subcategoria_nombre ?? "—"}
- Nombre en inglés (si lo hay): ${familia.nombre_en ?? "—"}
- Materiales: ${familia.materiales ?? "—"}
- Rango comercial: ${familia.rango_comercial ?? "—"}
- Presentación: ${familia.presentacion ?? "—"}

Normas técnicas adjuntas como fuente: ${referencias.join(", ")}.

Redactá descripción y aplicaciones basadas en lo que efectivamente describen las normas.`;

  const resp = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: [...docs, { type: "text", text: userText }] }],
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
    fuentes: referencias,
  });
}
