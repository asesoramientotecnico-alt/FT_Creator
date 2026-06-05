/**
 * Seed M1 — Familia "Allen cabeza cilíndrica" (ficha 1.1).
 * Datos del prototipo `referencia/ficha_1_1_allen_cabeza_cilindrica.html`.
 *
 *   npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const COLUMNAS = [
  { id: "d",     label: "d",      sub: "Nominal" },
  { id: "dk",    label: "dk (mm)", sub: "Ø cabeza" },
  { id: "k",     label: "k (mm)",  sub: "Alt. cabeza" },
  { id: "s",     label: "s (mm)",  sub: "Llave allen" },
  { id: "L_min", label: "L mín",   sub: "(mm)" },
  { id: "L_max", label: "L máx",   sub: "(mm)" },
  { id: "paso",  label: "Paso",    sub: "mm / TPI" },
];

const FILAS_METRICO = [
  { d: "M3",  dk: 5.5, k: 3,  s: 2.5, L_min: 6,  L_max: 40,  paso: "0,50" },
  { d: "M4",  dk: 7,   k: 4,  s: 3,   L_min: 8,  L_max: 60,  paso: "0,70" },
  { d: "M5",  dk: 8.5, k: 5,  s: 4,   L_min: 10, L_max: 80,  paso: "0,80" },
  { d: "M6",  dk: 10,  k: 6,  s: 5,   L_min: 12, L_max: 100, paso: "1,00" },
  { d: "M8",  dk: 13,  k: 8,  s: 6,   L_min: 16, L_max: 130, paso: "1,25" },
  { d: "M10", dk: 16,  k: 10, s: 8,   L_min: 20, L_max: 150, paso: "1,50" },
  { d: "M12", dk: 18,  k: 12, s: 10,  L_min: 25, L_max: 180, paso: "1,75" },
  { d: "M14", dk: 21,  k: 14, s: 12,  L_min: 30, L_max: 180, paso: "2,00" },
  { d: "M16", dk: 24,  k: 16, s: 14,  L_min: 35, L_max: 200, paso: "2,00" },
  { d: "M20", dk: 30,  k: 20, s: 17,  L_min: 45, L_max: 200, paso: "2,50" },
];

const FILAS_WHIT = [
  { d: '1/8"',  dk: 5.5,  k: 3,    s: 2.5, L_min: 6,  L_max: 25,  paso: "40 TPI" },
  { d: '3/16"', dk: 7,    k: 4,    s: 3,   L_min: 8,  L_max: 40,  paso: "24 TPI" },
  { d: '1/4"',  dk: 9.5,  k: 5.5,  s: 4,   L_min: 10, L_max: 60,  paso: "20 TPI" },
  { d: '5/16"', dk: 11,   k: 6.5,  s: 5,   L_min: 12, L_max: 80,  paso: "18 TPI" },
  { d: '3/8"',  dk: 14,   k: 8,    s: 6,   L_min: 16, L_max: 100, paso: "16 TPI" },
  { d: '1/2"',  dk: 19,   k: 10,   s: 8,   L_min: 20, L_max: 130, paso: "12 TPI" },
  { d: '5/8"',  dk: 22.5, k: 12,   s: 10,  L_min: 25, L_max: 150, paso: "11 TPI" },
  { d: '3/4"',  dk: 27,   k: 15,   s: 12,  L_min: 35, L_max: 180, paso: "10 TPI" },
];

async function upsertNorma(codigo: string, edicion: string) {
  const { data, error } = await sb
    .from("normas")
    .upsert({ codigo, edicion }, { onConflict: "codigo,edicion" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertTabla(args: {
  norma_id: string; nombre: string; descripcion: string;
  columnas: unknown; filas: unknown;
}) {
  // No tenemos unique sobre (norma_id, nombre); buscamos primero.
  const { data: existing } = await sb
    .from("tablas_normativas")
    .select("id")
    .eq("norma_id", args.norma_id)
    .eq("nombre", args.nombre)
    .maybeSingle();

  if (existing) {
    const { data, error } = await sb
      .from("tablas_normativas")
      .update({
        descripcion: args.descripcion,
        columnas: args.columnas,
        filas: args.filas,
        estado: "validada",
        extraida_por: "manual",
        validada_en: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await sb
    .from("tablas_normativas")
    .insert({
      norma_id: args.norma_id,
      nombre: args.nombre,
      descripcion: args.descripcion,
      columnas: args.columnas,
      filas: args.filas,
      estado: "validada",
      extraida_por: "manual",
      validada_en: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  console.log("→ Normas…");
  const din912 = await upsertNorma("DIN 912", "2013");
  const ansi   = await upsertNorma("ANSI B18.3", "2012");

  console.log("→ Tablas normativas…");
  const tablaMet = await upsertTabla({
    norma_id: din912.id,
    nombre: "Allen cabeza cilíndrica — serie métrica",
    descripcion: "Tolerancia 6g · Paso normal (coarse)",
    columnas: COLUMNAS,
    filas: FILAS_METRICO,
  });
  const tablaWhit = await upsertTabla({
    norma_id: ansi.id,
    nombre: "Allen cabeza cilíndrica — serie Whitworth BSW",
    descripcion: "TPI = hilos por pulgada",
    columnas: COLUMNAS,
    filas: FILAS_WHIT,
  });

  console.log("→ Familia…");
  const familiaPayload = {
    slug: "allen-cabeza-cilindrica",
    categoria_num: 1,
    categoria_nombre: "Allen de acero inoxidable",
    subcategoria_num: "1.1",
    subcategoria_nombre: "Cabeza Cilíndrica",
    nombre_en: "Socket Head Cap Screw",
    materiales: "A2 — AISI 304 / 304L\nA4 — AISI 316 / 316L",
    rango_comercial: 'Métrica M3 — M20 · paso 0,5 a 2,5 mm\nWhitworth 1/8" — 3/4"',
    presentacion: "Pack 1 (20 un.) · Pack 2 (50 un.) · Pack 3 (100 un.)",
    descripcion:
      "Tornillo inoxidable con cabeza cilíndrica y accionamiento hexagonal interno. " +
      "Alta resistencia mecánica. Ideal para uniones estructurales donde se requiere " +
      "bajo perfil y acceso axial. El accionamiento interior permite mayor par de " +
      "apriete con menor espacio lateral.",
    descripcion_origen: "humano" as const,
    aplicaciones: ["Maquinaria", "Estructuras", "Oil & Gas", "Ind. alimentaria", "Náutica", "Farmacéutica"],
    svg_path: "/familias/allen-cabeza-cilindrica.svg",
    svg_origen: "subido" as const,
    estado: "validada" as const,
    validada_en: new Date().toISOString(),
  };

  const { data: existingFam } = await sb
    .from("familias")
    .select("id")
    .eq("slug", familiaPayload.slug)
    .maybeSingle();

  let familiaId: string;
  if (existingFam) {
    const { data, error } = await sb
      .from("familias")
      .update(familiaPayload)
      .eq("id", existingFam.id)
      .select()
      .single();
    if (error) throw error;
    familiaId = data.id;
    await sb.from("ficha_series").delete().eq("familia_id", familiaId);
  } else {
    const { data, error } = await sb.from("familias").insert(familiaPayload).select().single();
    if (error) throw error;
    familiaId = data.id;
  }

  console.log("→ Ficha series…");
  const { error: eSer } = await sb.from("ficha_series").insert([
    {
      familia_id: familiaId,
      tabla_normativa_id: tablaMet.id,
      sistema: "metrico",
      nota: "Tolerancia 6g · Paso normal (coarse)",
      orden: 0,
    },
    {
      familia_id: familiaId,
      tabla_normativa_id: tablaWhit.id,
      sistema: "pulgadas",
      nota: "TPI = hilos por pulgada",
      orden: 1,
    },
  ]);
  if (eSer) throw eSer;

  console.log("✔ Seed OK — familia:", familiaPayload.slug);
}

main().catch((e) => {
  console.error("✗ Seed falló:", e);
  process.exit(1);
});
