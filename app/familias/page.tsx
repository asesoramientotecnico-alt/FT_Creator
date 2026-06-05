import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FamiliasPage() {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("familias")
    .select("slug, categoria_num, categoria_nombre, subcategoria_num, subcategoria_nombre, nombre_en, estado")
    .order("categoria_num", { nullsFirst: false })
    .order("subcategoria_num");

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <nav style={{ fontSize: 14, marginBottom: 16 }}><Link href="/">← Home</Link></nav>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Familias</h1>
        <Link
          href="/familias/nueva"
          style={{ padding: "8px 14px", background: "#1a4b8c", color: "white", borderRadius: 6, textDecoration: "none", fontSize: 14 }}
        >
          + Nueva familia
        </Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 20 }}>
        {(data ?? []).map((f) => (
          <Link
            key={f.slug}
            href={`/familias/${f.slug}`}
            style={{ display: "block", padding: 14, border: "1px solid #e3e3e3", borderRadius: 8, textDecoration: "none", color: "inherit" }}
          >
            <div style={{ fontSize: 12, color: "#999" }}>
              {f.categoria_num != null ? `${f.categoria_num}.${f.subcategoria_num ?? ""}` : "—"}
            </div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{f.subcategoria_nombre ?? "(sin nombre)"}</div>
            {f.nombre_en && <div style={{ fontSize: 12, color: "#888" }}>{f.nombre_en}</div>}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, color: "white", background: f.estado === "validada" ? "#2a7" : "#c80" }}>
                {f.estado}
              </span>
            </div>
          </Link>
        ))}
        {(!data || data.length === 0) && <p style={{ color: "#999" }}>No hay familias. Creá una con “Nueva familia”.</p>}
      </div>
    </main>
  );
}
