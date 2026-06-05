import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/extraer-tabla
// body: { norma_id: string, indicacion: string }
// Lee el PDF del Storage (norma.pdf_path), se lo manda a Claude como documento
// y devuelve un borrador de tabla_normativa con notas_extraccion.
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { norma_id, indicacion } = (await req.json().catch(() => ({}))) as {
    norma_id?: string; indicacion?: string;
  };
  if (!norma_id || !indicacion) {
    return NextResponse.json({ error: "norma_id e indicacion son requeridos" }, { status: 400 });
  }

  const { data: norma, error: eN } = await sb
    .from("normas")
    .select("id, codigo, edicion, pdf_path")
    .eq("id", norma_id)
    .maybeSingle();
  if (eN || !norma) return NextResponse.json({ error: "norma no encontrada" }, { status: 404 });
  if (!norma.pdf_path) return NextResponse.json({ error: "norma sin pdf_path" }, { status: 400 });

  const { data: file, error: eFile } = await sb.storage.from("normas").download(norma.pdf_path);
  if (eFile || !file) return NextResponse.json({ error: "no se pudo bajar el PDF" }, { status: 500 });

  const ab = await file.arrayBuffer();
  const b64 = Buffer.from(ab).toString("base64");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const client = new Anthropic({ apiKey });

  const system = `Sos un asistente que extrae tablas dimensionales de normas técnicas a JSON estructurado.

REGLAS DURAS:
- NUNCA inventes valores. Si una celda es ilegible o ambigua → null y agregala a notas_extraccion con motivo.
- Respetá unidades y separador decimal con punto. NO conviertas unidades.
- Devolvé SOLO JSON válido, sin texto adicional, sin markdown fences.

ESQUEMA DE SALIDA:
{
  "nombre": string,                 // ej: "Tabla 1 — paso grueso"
  "descripcion": string | null,
  "columnas": [
    { "id": string, "label": string, "sub": string | null, "con_tolerancia": boolean }
  ],
  "filas": [
    // cada fila: { <col.id>: number | string | null | { "nom": ..., "max": ..., "min": ... } }
  ],
  "notas_extraccion": [
    { "fila": number, "columna": string, "motivo": string }
  ]
}`;

  const userText = `Norma: ${norma.codigo} (${norma.edicion}).
Indicación del usuario: ${indicacion}

Extraé la tabla pedida del PDF adjunto siguiendo el esquema. Si una columna tiene tolerancia (nom/máx/mín), usá objeto { nom, max, min }. Si no, valor escalar. Si una celda no se lee con certeza, ponela null y agregala a notas_extraccion.`;

  const resp = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 8192,
    system,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: userText },
        ],
      },
    ],
  });

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();

  // Robustez: si llega envuelto en ```json ... ```, lo limpiamos.
  const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: {
    nombre: string;
    descripcion: string | null;
    columnas: unknown;
    filas: unknown;
    notas_extraccion: unknown;
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return NextResponse.json(
      { error: "Claude no devolvió JSON válido", raw: text.slice(0, 2000) },
      { status: 502 }
    );
  }

  const { data: inserted, error: eIns } = await sb
    .from("tablas_normativas")
    .insert({
      norma_id: norma.id,
      nombre: parsed.nombre,
      descripcion: parsed.descripcion ?? null,
      columnas: parsed.columnas ?? [],
      filas: parsed.filas ?? [],
      estado: "borrador",
      extraida_por: "ia",
      notas_extraccion: parsed.notas_extraccion ?? [],
    })
    .select("id")
    .single();
  if (eIns) return NextResponse.json({ error: eIns.message }, { status: 400 });

  return NextResponse.json({ tabla_id: inserted.id });
}
