import { notFound } from "next/navigation";
import { Ficha } from "@/components/ficha/Ficha";
import { loadFichas } from "@/lib/ficha-loader";
import "./catalogo.css";

export const dynamic = "force-dynamic";

// Vista imprimible del catálogo unificado. La consume /api/catalogo/pdf vía puppeteer.
// ?slugs=a,b,c — en ese orden.
export default async function CatalogoImprimir({
  searchParams,
}: {
  searchParams: Promise<{ slugs?: string }>;
}) {
  const { slugs } = await searchParams;
  const lista = (slugs ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (lista.length === 0) notFound();

  const fichas = await loadFichas(lista);
  if (fichas.length === 0) notFound();

  const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  return (
    <>
      <style>{`body { background: white !important; padding: 0 !important; margin: 0 !important; } .ficha { box-shadow: none !important; margin: 0 auto !important; }`}</style>

      {/* Portada */}
      <section className="cat-portada">
        <div className="cat-portada__marca">FAMIQ</div>
        <h1 className="cat-portada__titulo">Catálogo de bulonería inoxidable</h1>
        <div className="cat-portada__sub">Fichas técnicas · Oficina Técnica</div>
        <div className="cat-portada__fecha">{fecha}</div>
      </section>

      {/* Índice */}
      <section className="cat-indice">
        <h2 className="cat-indice__titulo">Índice</h2>
        <ol className="cat-indice__lista">
          {fichas.map((f, i) => (
            <li key={f.familia.slug} className="cat-indice__item">
              <span className="cat-indice__num">
                {f.familia.categoria_num != null
                  ? `${f.familia.categoria_num}.${f.familia.subcategoria_num ?? ""}`
                  : "—"}
              </span>
              <span className="cat-indice__nombre">
                {f.familia.subcategoria_nombre ?? f.familia.slug}
                {f.familia.estado !== "validada" && <em className="cat-indice__borr"> (borrador)</em>}
              </span>
              <span className="cat-indice__pag">{i + 1}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Fichas */}
      {fichas.map((f) => (
        <div key={f.familia.slug} className="cat-ficha-wrap">
          <Ficha data={f} borrador={f.familia.estado !== "validada"} />
        </div>
      ))}
    </>
  );
}
