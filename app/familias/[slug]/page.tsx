import Link from "next/link";
import { notFound } from "next/navigation";
import { Ficha } from "@/components/ficha/Ficha";
import { loadFichaBySlug } from "@/lib/ficha-loader";
import { supabaseServer } from "@/lib/supabase/server";
import { DatosGeneralesForm } from "../_components/DatosGeneralesForm";
import { SeriesEditor, type SerieLite, type TablaLite } from "../_components/SeriesEditor";
import { TextosEditor } from "../_components/TextosEditor";
import { PlanoEditor } from "../_components/PlanoEditor";
import { PendientesEditor, type Pendiente } from "../_components/PendientesEditor";
import { ValidarFamilia } from "../_components/ValidarFamilia";
import { NormasAsistente } from "../_components/NormasAsistente";

export const dynamic = "force-dynamic";

export default async function FichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { slug } = await params;
  const { print } = await searchParams;

  // Vista imprimible (la consume el endpoint del PDF vía puppeteer). NO tocar contrato.
  if (print === "1") {
    const data = await loadFichaBySlug(slug);
    if (!data) notFound();
    const borrador = data.familia.estado !== "validada";
    return (
      <>
        <style>{`body { background: white !important; padding: 0 !important; } .ficha { box-shadow: none !important; margin: 0 !important; }`}</style>
        <Ficha data={data} borrador={borrador} />
      </>
    );
  }

  // Editor.
  const sb = await supabaseServer();
  const { data: familia } = await sb
    .from("familias")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!familia) notFound();

  // Series vinculadas (con la tabla y su norma).
  const { data: seriesRaw } = await sb
    .from("ficha_series")
    .select("id, sistema, nota, filas_incluidas, tabla:tablas_normativas(id, nombre, columnas, filas, norma:normas(codigo, edicion))")
    .eq("familia_id", familia.id)
    .order("orden");
  const series: SerieLite[] = (seriesRaw ?? []).map((s: any) => ({
    id: s.id, sistema: s.sistema, nota: s.nota, filas_incluidas: s.filas_incluidas,
    tabla: s.tabla as TablaLite,
  }));

  // Tablas validadas disponibles para vincular.
  const { data: tablasRaw } = await sb
    .from("tablas_normativas")
    .select("id, nombre, columnas, filas, norma:normas(codigo, edicion)")
    .eq("estado", "validada");
  const tablasValidadas: TablaLite[] = (tablasRaw ?? []) as any;

  // Pendientes.
  const { data: pendRaw } = await sb
    .from("pendientes")
    .select("id, tipo, detalle, resuelto")
    .eq("familia_id", familia.id)
    .order("creado_en");
  const pendientes: Pendiente[] = (pendRaw ?? []) as any;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <nav style={{ fontSize: 14, marginBottom: 16 }}><Link href="/familias">← Familias</Link></nav>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{familia.subcategoria_nombre ?? slug}</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 10, color: "white", background: familia.estado === "validada" ? "#2a7" : "#c80" }}>
            {familia.estado}
          </span>
          <a href={`/api/familias/${slug}/pdf`} style={{ fontSize: 14 }}>PDF</a>
        </div>
      </header>

      <Seccion titulo="Datos generales">
        <DatosGeneralesForm
          mode="editar"
          slug={slug}
          initial={{
            categoria_num: familia.categoria_num,
            categoria_nombre: familia.categoria_nombre,
            subcategoria_num: familia.subcategoria_num,
            subcategoria_nombre: familia.subcategoria_nombre,
            nombre_en: familia.nombre_en,
            materiales: familia.materiales,
            rango_comercial: familia.rango_comercial,
            presentacion: familia.presentacion,
          }}
        />
      </Seccion>

      <Seccion titulo="Plano">
        <PlanoEditor slug={slug} svgPath={familia.svg_path} svgOrigen={familia.svg_origen} />
      </Seccion>

      <Seccion titulo="Asistente de normas">
        <NormasAsistente slug={slug} />
      </Seccion>

      <Seccion titulo="Series dimensionales">
        <SeriesEditor slug={slug} series={series} tablasValidadas={tablasValidadas} />
      </Seccion>

      <Seccion titulo="Textos">
        <TextosEditor
          slug={slug}
          initialDescripcion={familia.descripcion}
          initialAplicaciones={familia.aplicaciones ?? []}
          initialOrigen={familia.descripcion_origen}
        />
      </Seccion>

      <Seccion titulo="Pendientes">
        <PendientesEditor slug={slug} pendientes={pendientes} />
      </Seccion>

      <Seccion titulo="Validación">
        <ValidarFamilia slug={slug} estado={familia.estado} />
      </Seccion>
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 17, borderBottom: "2px solid #1a4b8c", paddingBottom: 6, marginBottom: 14 }}>{titulo}</h2>
      {children}
    </section>
  );
}
