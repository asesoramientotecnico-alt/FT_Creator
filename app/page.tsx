import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { SignOut } from "@/components/SignOut";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb
    .from("familias")
    .select("slug, categoria_num, categoria_nombre, subcategoria_num, subcategoria_nombre, estado")
    .order("categoria_num")
    .order("subcategoria_num");

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>FAMIQ — Fichas técnicas</h1>
        {user && (
          <span style={{ fontSize: 13, color: "#666" }}>
            {user.email} · <SignOut />
          </span>
        )}
      </header>

      <nav style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 14 }}>
        <Link href="/normas">Normas</Link>
        <Link href="/familias">Familias</Link>
        <Link href="/catalogo">Catálogo</Link>
      </nav>

      <h2 style={{ marginTop: 24, marginBottom: 8, fontSize: 18 }}>Familias recientes</h2>
      <ul>
        {(data ?? []).slice(0, 8).map((f) => (
          <li key={f.slug}>
            <Link href={`/familias/${f.slug}`}>
              {f.categoria_num}.{f.subcategoria_num} — {f.subcategoria_nombre}
            </Link>{" "}
            <small style={{ color: "#999" }}>({f.estado})</small>
          </li>
        ))}
        {(!data || data.length === 0) && <li style={{ color: "#999" }}>No hay familias. <Link href="/familias/nueva">Crear una →</Link></li>}
      </ul>
    </main>
  );
}
