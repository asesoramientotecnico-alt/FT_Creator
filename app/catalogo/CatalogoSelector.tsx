"use client";
import { useState } from "react";

export type FamiliaItem = {
  slug: string;
  categoria_num: number | null;
  subcategoria_num: string | null;
  subcategoria_nombre: string | null;
  estado: string;
};

export function CatalogoSelector({ familias }: { familias: FamiliaItem[] }) {
  const [sel, setSel] = useState<string[]>([]); // mantiene el orden de selección
  const [soloValidadas, setSoloValidadas] = useState(false);

  const visibles = soloValidadas ? familias.filter((f) => f.estado === "validada") : familias;

  function toggle(slug: string) {
    setSel((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  const href = `/api/catalogo/pdf?slugs=${encodeURIComponent(sel.join(","))}`;

  return (
    <div>
      <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={soloValidadas} onChange={(e) => setSoloValidadas(e.target.checked)} />
        Mostrar solo validadas
      </label>

      <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, overflow: "hidden" }}>
        {visibles.map((f) => {
          const checked = sel.includes(f.slug);
          const orden = sel.indexOf(f.slug) + 1;
          return (
            <label key={f.slug} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", background: checked ? "#f3f7fc" : undefined }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(f.slug)} />
              {checked && <span style={{ fontSize: 11, width: 18, height: 18, lineHeight: "18px", textAlign: "center", borderRadius: "50%", background: "#1a4b8c", color: "white" }}>{orden}</span>}
              <span style={{ color: "#999", fontSize: 13, minWidth: 40 }}>
                {f.categoria_num != null ? `${f.categoria_num}.${f.subcategoria_num ?? ""}` : "—"}
              </span>
              <span style={{ flex: 1 }}>{f.subcategoria_nombre ?? f.slug}</span>
              <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 10, color: "white", background: f.estado === "validada" ? "#2a7" : "#c80" }}>{f.estado}</span>
            </label>
          );
        })}
        {visibles.length === 0 && <p style={{ padding: 16, color: "#999", margin: 0 }}>No hay familias.</p>}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        {sel.length > 0 ? (
          <a href={href} target="_blank" rel="noreferrer" style={{ padding: "10px 18px", background: "#1a4b8c", color: "white", borderRadius: 6, textDecoration: "none", fontSize: 14 }}>
            Generar catálogo PDF ({sel.length})
          </a>
        ) : (
          <button disabled style={{ padding: "10px 18px", background: "#ccc", color: "white", border: 0, borderRadius: 6, fontSize: 14 }}>
            Elegí al menos una familia
          </button>
        )}
        {sel.length > 0 && (
          <button onClick={() => setSel([])} style={{ background: "none", border: 0, color: "#1a4b8c", cursor: "pointer", fontSize: 13 }}>Limpiar</button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>El número en cada fila es el orden en que aparecerán en el catálogo.</p>
    </div>
  );
}
