import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ExtraerForm } from "./ExtraerForm";

export const dynamic = "force-dynamic";

export default async function NormaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: norma } = await sb
    .from("normas")
    .select("id, codigo, edicion, pdf_path, tablas_normativas(id, nombre, estado)")
    .eq("id", id)
    .maybeSingle();
  if (!norma) notFound();

  let pdfUrl: string | null = null;
  if (norma.pdf_path) {
    const { data: signed } = await sb.storage.from("normas").createSignedUrl(norma.pdf_path, 60 * 60);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <nav style={{ fontSize: 14, marginBottom: 16 }}><Link href="/normas">← Normas</Link></nav>
      <h1 style={{ marginTop: 0 }}>{norma.codigo} <span style={{ color: "#999", fontWeight: 400 }}>· {norma.edicion}</span></h1>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16 }}>Tablas</h2>
        {norma.tablas_normativas.length === 0 ? (
          <p style={{ color: "#999" }}>No hay tablas extraídas todavía.</p>
        ) : (
          <ul>
            {norma.tablas_normativas.map((t) => (
              <li key={t.id}>
                <Link href={`/normas/${norma.id}/tablas/${t.id}`}>{t.nombre}</Link>{" "}
                <span style={{ color: t.estado === "validada" ? "#2a7" : "#c80" }}>({t.estado})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24, padding: 16, background: "#f6f7f9", borderRadius: 6 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Extraer tabla con IA</h2>
        <p style={{ fontSize: 13, color: "#666" }}>
          Indicá qué tabla querés extraer (ej. <i>Tabla 1, paso grueso</i>). Se crea un borrador para revisar.
        </p>
        <ExtraerForm normaId={norma.id} />
      </section>

      {pdfUrl && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16 }}>PDF</h2>
          <iframe src={pdfUrl} style={{ width: "100%", height: 600, border: "1px solid #ddd", borderRadius: 6 }} />
        </section>
      )}
    </main>
  );
}
