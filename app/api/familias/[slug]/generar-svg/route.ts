import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `Sos un diseñador técnico que produce planos esquemáticos de bulonería en SVG, en el estilo del catálogo FAMIQ.

REGLAS DURAS:
- Devolvé SOLO el SVG válido, completo, en una sola línea o con saltos. NADA de texto antes o después. NADA de markdown.
- viewBox razonable, sin width/height fijos (que escale). preserveAspectRatio="xMidYMid meet".
- Líneas finitas, stroke="#1a2b3c", stroke-width entre 1 y 2, fill transparente o blanco según corresponda.
- COTAS LETRA: usá letras (d, dk, k, s, L, etc.) como nombres simbólicos, no números. Las cotas las completa la tabla normativa.
- Líneas de cota con flechas en los extremos (usá <marker> o líneas con triangulitos). Tipografía sans-serif, font-size 10–14.
- Composición: pieza centrada, cotas alrededor, sin sombras ni gradientes. Estética limpia, geométrica.
- Fondo transparente (sin <rect> de fondo).
- Sin <script>, sin eventos, sin URLs externas, sin imágenes embebidas. Solo formas vectoriales y texto.
- IDIOMA: cualquier texto del SVG (etiquetas auxiliares, leyendas, vistas) en CASTELLANO. Los símbolos técnicos normalizados (d, dk, k, s, L, e, P…) NO se traducen — son notación universal.
- Tamaño total razonable: el SVG debería pesar menos de 20 KB.`;

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "form-data esperado" }, { status: 400 });

  const indicacion = (form.get("indicacion") as string | null)?.trim() ?? "";
  const ref = form.get("referencia") as File | null;

  const { data: f } = await sb
    .from("familias")
    .select("categoria_nombre, subcategoria_nombre, nombre_en, materiales, presentacion")
    .eq("slug", slug)
    .maybeSingle();
  if (!f) return NextResponse.json({ error: "familia no encontrada" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
  const client = new Anthropic({ apiKey });

  const contextoFamilia = [
    `Categoría: ${f.categoria_nombre ?? "—"}`,
    `Subcategoría: ${f.subcategoria_nombre ?? "—"}`,
    f.nombre_en ? `Nombre en inglés: ${f.nombre_en}` : null,
    f.materiales ? `Materiales: ${f.materiales}` : null,
  ].filter(Boolean).join("\n");

  const userBlocks: Anthropic.ContentBlockParam[] = [];
  if (ref && ref.size > 0) {
    const buf = Buffer.from(await ref.arrayBuffer());
    const mediaType = (ref.type || "image/png") as "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    userBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: buf.toString("base64") },
    });
    userBlocks.push({
      type: "text",
      text: `Redibujá la pieza de la imagen de referencia en el estilo del catálogo FAMIQ (vectorial, cotas letra, líneas finas, blanco/azul oscuro). Conservá la geometría real de la pieza pero NO copies estilos visuales (no rellenos pesados, no fotorrealismo).\n\nContexto:\n${contextoFamilia}${indicacion ? `\n\nIndicación adicional: ${indicacion}` : ""}`,
    });
  } else {
    userBlocks.push({
      type: "text",
      text: `Generá un plano esquemático para la siguiente familia de bulonería:\n\n${contextoFamilia}${indicacion ? `\n\nIndicación adicional: ${indicacion}` : ""}\n\nMostrá vista de perfil con las cotas simbólicas habituales para esta familia (ej. d para diámetro nominal, k para altura de cabeza, s para entre caras, L para longitud, etc.).`,
    });
  }

  const resp = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    system: SYSTEM,
    messages: [{ role: "user", content: userBlocks }],
  });

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text).join("\n").trim();

  // Aislar el SVG: por si llega texto extra antes o después.
  const m = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) {
    return NextResponse.json({ error: "Claude no devolvió un SVG válido", raw: text.slice(0, 1500) }, { status: 502 });
  }
  const svg = m[0];

  // Subimos el SVG al bucket público 'planos'.
  const path = `${slug}/${Date.now()}_ia.svg`;
  const { error: eUp } = await sb.storage
    .from("planos")
    .upload(path, new Blob([svg], { type: "image/svg+xml" }), { upsert: false });
  if (eUp) return NextResponse.json({ error: eUp.message }, { status: 500 });

  const { data: pub } = sb.storage.from("planos").getPublicUrl(path);

  const origen = ref && ref.size > 0 ? "ia_redibujado" : "ia";
  const { error: eFam } = await sb
    .from("familias")
    .update({ svg_path: pub.publicUrl, svg_origen: origen })
    .eq("slug", slug);
  if (eFam) return NextResponse.json({ error: eFam.message }, { status: 400 });

  return NextResponse.json({ publicUrl: pub.publicUrl, origen, svg });
}
