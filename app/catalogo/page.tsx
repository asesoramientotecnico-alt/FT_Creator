import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { CatalogoSelector, type FamiliaItem } from "./CatalogoSelector";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("familias")
    .select("slug, categoria_num, subcategoria_num, subcategoria_nombre, estado")
    .order("categoria_num", { nullsFirst: false })
    .order("subcategoria_num");

  const familias: FamiliaItem[] = (data ?? []) as any;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <nav style={{ fontSize: 14, marginBottom: 16 }}><Link href="/">← Home</Link></nav>
      <h1 style={{ marginTop: 0 }}>Catálogo unificado</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Elegí las familias a incluir. El catálogo arma portada + índice + una ficha por página.
        Las familias en borrador salen con marca de agua.
      </p>
      <CatalogoSelector familias={familias} />
    </main>
  );
}
