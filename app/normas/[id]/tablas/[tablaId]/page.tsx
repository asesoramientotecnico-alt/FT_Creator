import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { RevisarTabla } from "./RevisarTabla";

export const dynamic = "force-dynamic";

export default async function TablaPage({ params }: { params: Promise<{ id: string; tablaId: string }> }) {
  const { id, tablaId } = await params;
  const sb = await supabaseServer();

  const { data: tabla } = await sb
    .from("tablas_normativas")
    .select("id, norma_id, nombre, descripcion, columnas, filas, estado, notas_extraccion, validada_por, validada_en")
    .eq("id", tablaId)
    .maybeSingle();
  if (!tabla) notFound();

  const { data: norma } = await sb
    .from("normas")
    .select("id, codigo, edicion, pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (!norma) notFound();

  let pdfUrl: string | null = null;
  if (norma.pdf_path) {
    const { data: signed } = await sb.storage.from("normas").createSignedUrl(norma.pdf_path, 60 * 60);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <main style={{ padding: "1rem 1.5rem", background: "white", minHeight: "100vh" }}>
      <nav style={{ fontSize: 14, marginBottom: 8 }}>
        <Link href="/normas">Normas</Link> · <Link href={`/normas/${norma.id}`}>{norma.codigo} {norma.edicion}</Link>
      </nav>
      <RevisarTabla
        tablaId={tabla.id}
        normaCodigo={`${norma.codigo} ${norma.edicion}`}
        pdfUrl={pdfUrl}
        initial={{
          nombre: tabla.nombre,
          descripcion: tabla.descripcion,
          columnas: tabla.columnas as any,
          filas: tabla.filas as any,
          notas_extraccion: (tabla.notas_extraccion ?? []) as any,
          estado: tabla.estado,
        }}
      />
    </main>
  );
}
