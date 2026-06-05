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
    .select("id, sistema, nota, orden, tabla:tablas_normativas(*, norma:normas(*))")
    .eq("familia_id", familia.id)
    .order("orden");
  if (eSer) throw eSer;

  const series: Serie[] = (seriesRaw ?? []).map((s: any) => ({
    id: s.id,
    sistema: s.sistema,
    nota: s.nota,
    orden: s.orden,
    tabla: s.tabla as TablaNormativa,
    norma: s.tabla.norma as Norma,
  }));

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
