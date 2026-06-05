import Link from "next/link";
import { supabaseAnon } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = supabaseAnon();
  const { data } = await sb
    .from("familias")
    .select("slug, categoria_num, categoria_nombre, subcategoria_num, subcategoria_nombre, estado")
    .order("categoria_num")
    .order("subcategoria_num");

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>FAMIQ — Fichas técnicas</h1>
      <p style={{ color: "#666" }}>M1 — Ficha estática end-to-end.</p>
      <ul>
        {(data ?? []).map((f) => (
          <li key={f.slug}>
            <Link href={`/familias/${f.slug}`}>
              {f.categoria_num}.{f.subcategoria_num} — {f.subcategoria_nombre}
            </Link>{" "}
            <small style={{ color: "#999" }}>
              ({f.estado}) · <a href={`/api/familias/${f.slug}/pdf`}>PDF</a>
            </small>
          </li>
        ))}
        {(!data || data.length === 0) && <li style={{ color: "#999" }}>No hay familias cargadas. Correr `npm run seed`.</li>}
      </ul>
    </main>
  );
}
