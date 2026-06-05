import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NormasPage() {
  const sb = await supabaseServer();
  const { data: normas } = await sb
    .from("normas")
    .select("id, codigo, edicion, creado_en, tablas_normativas(id, nombre, estado)")
    .order("creado_en", { ascending: false });

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <nav style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 14 }}>
        <Link href="/">← Home</Link>
      </nav>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Normas</h1>
        <Link
          href="/normas/nueva"
          style={{ padding: "8px 14px", background: "#1a4b8c", color: "white", borderRadius: 6, textDecoration: "none", fontSize: 14 }}
        >
          + Nueva norma
        </Link>
      </header>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {(normas ?? []).map((n) => (
          <li key={n.id} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 600 }}>{n.codigo} <span style={{ color: "#999", fontWeight: 400 }}>· edición {n.edicion}</span></div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
              {n.tablas_normativas.length === 0 ? (
                <Link href={`/normas/${n.id}`}>Sin tablas extraídas — extraer →</Link>
              ) : (
                <>
                  {n.tablas_normativas.map((t) => (
                    <span key={t.id} style={{ marginRight: 12 }}>
                      <Link href={`/normas/${n.id}/tablas/${t.id}`}>{t.nombre}</Link>{" "}
                      <span style={{ color: t.estado === "validada" ? "#2a7" : "#c80" }}>({t.estado})</span>
                    </span>
                  ))}
                  · <Link href={`/normas/${n.id}`}>+ extraer otra tabla</Link>
                </>
              )}
            </div>
          </li>
        ))}
        {(!normas || normas.length === 0) && <li style={{ color: "#999" }}>No hay normas cargadas.</li>}
      </ul>
    </main>
  );
}
