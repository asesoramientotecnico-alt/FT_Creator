import { supabaseServer } from "./supabase/server";
import type { FichaData, Norma, Serie, TablaNormativa } from "./types";

export async function loadFichaBySlug(slug: string): Promise<FichaData | null> {
  const sb = await supabaseServer();

  const { data: familia, error: eFam } = await sb
    .from("familias")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (eFam) throw eFam;
  if (!familia) return null;

  const { data: seriesRaw, error: eSer } = await sb
    .from("ficha_series")
    .select("id, sistema, nota, orden, filas_incluidas, tabla:tablas_normativas(*, norma:normas(*))")
    .eq("familia_id", familia.id)
    .order("orden");
  if (eSer) throw eSer;

  const series: Serie[] = (seriesRaw ?? []).map((s: any) => {
    const tabla = s.tabla as TablaNormativa & { norma: Norma };
    const incluidas: number[] | null = s.filas_incluidas ?? null;
    // Filtramos las filas al rango comercial (índices seleccionados); null = todas.
    const tablaFiltrada: TablaNormativa = incluidas
      ? { ...tabla, filas: incluidas.map((i) => tabla.filas[i]).filter(Boolean) }
      : tabla;
    return {
      id: s.id,
      sistema: s.sistema,
      nota: s.nota,
      orden: s.orden,
      filas_incluidas: incluidas,
      tabla: tablaFiltrada,
      norma: tabla.norma as Norma,
    };
  });

  const normaIds = new Set<string>();
  const normas_aplicables: Norma[] = [];
  for (const s of series) {
    if (!normaIds.has(s.norma.id)) {
      normaIds.add(s.norma.id);
      normas_aplicables.push(s.norma);
    }
  }

  return { familia, series, normas_aplicables };
}
