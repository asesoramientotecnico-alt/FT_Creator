"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnaTabla, FilaTabla, Sistema } from "@/lib/types";

export type TablaLite = {
  id: string;
  nombre: string;
  columnas: ColumnaTabla[];
  filas: FilaTabla[];
  norma: { codigo: string; edicion: string };
};

export type SerieLite = {
  id: string;
  sistema: Sistema;
  nota: string | null;
  filas_incluidas: number[] | null;
  tabla: TablaLite;
};

// Etiqueta legible de una fila: valor de la primera columna (ej "M6").
function filaLabel(columnas: ColumnaTabla[], fila: FilaTabla): string {
  const first = columnas[0];
  if (!first) return "—";
  const v = fila[first.id];
  if (v == null) return "—";
  if (typeof v === "object" && "nom" in v) return String((v as { nom: unknown }).nom ?? "—");
  return String(v);
}

export function SeriesEditor({
  slug,
  series,
  tablasValidadas,
}: {
  slug: string;
  series: SerieLite[];
  tablasValidadas: TablaLite[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div>
      {series.length === 0 && !adding && (
        <p style={{ color: "#999", fontSize: 14 }}>No hay series vinculadas todavía.</p>
      )}

      {series.map((s) => (
        <SerieCard key={s.id} serie={s} onChange={() => router.refresh()} />
      ))}

      {adding ? (
        <AgregarSerie
          slug={slug}
          tablasValidadas={tablasValidadas}
          onDone={() => { setAdding(false); router.refresh(); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} style={btnSec} disabled={tablasValidadas.length === 0}>
          + Vincular tabla validada
        </button>
      )}
      {tablasValidadas.length === 0 && (
        <p style={{ color: "#999", fontSize: 13, marginTop: 8 }}>
          No hay tablas validadas. Cargá y validá una en <a href="/normas">Normas</a>.
        </p>
      )}
    </div>
  );
}

function SerieCard({ serie, onChange }: { serie: SerieLite; onChange: () => void }) {
  const total = serie.tabla.filas.length;
  const incluidas = serie.filas_incluidas;
  const [editingRows, setEditingRows] = useState(false);
  const [sel, setSel] = useState<Set<number>>(
    new Set(incluidas ?? serie.tabla.filas.map((_, i) => i))
  );
  const [nota, setNota] = useState(serie.nota ?? "");
  const [busy, setBusy] = useState(false);

  async function guardar() {
    setBusy(true);
    await fetch(`/api/series/${serie.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filas_incluidas: [...sel].sort((a, b) => a - b), nota }),
    });
    setBusy(false);
    setEditingRows(false);
    onChange();
  }

  async function eliminar() {
    if (!confirm("¿Desvincular esta serie?")) return;
    setBusy(true);
    await fetch(`/api/series/${serie.id}`, { method: "DELETE" });
    onChange();
  }

  const nSel = incluidas ? incluidas.length : total;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <strong>{serie.tabla.norma.codigo}</strong> <span style={{ color: "#888", fontSize: 13 }}>· {serie.tabla.nombre}</span>
          <div style={{ fontSize: 12, color: "#888" }}>
            Sistema {serie.sistema === "metrico" ? "métrico" : "pulgadas"} · {nSel}/{total} filas en rango
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setEditingRows((v) => !v)} style={btnLink}>{editingRows ? "Cerrar" : "Editar filas"}</button>
          <button onClick={eliminar} style={{ ...btnLink, color: "#b00" }} disabled={busy}>Quitar</button>
        </div>
      </div>

      {editingRows && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => setSel(new Set(serie.tabla.filas.map((_, i) => i)))} style={btnLink}>Todas</button>
            <button onClick={() => setSel(new Set())} style={btnLink}>Ninguna</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflow: "auto", padding: 8, background: "#f6f7f9", borderRadius: 6 }}>
            {serie.tabla.filas.map((fila, i) => {
              const on = sel.has(i);
              return (
                <button
                  key={i}
                  onClick={() => setSel((prev) => { const n = new Set(prev); on ? n.delete(i) : n.add(i); return n; })}
                  style={{
                    padding: "4px 10px", borderRadius: 14, fontSize: 13, cursor: "pointer",
                    border: on ? "1px solid #1a4b8c" : "1px solid #ccc",
                    background: on ? "#1a4b8c" : "white", color: on ? "white" : "#555",
                  }}
                >
                  {filaLabel(serie.tabla.columnas, fila)}
                </button>
              );
            })}
          </div>
          <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
            Nota de la serie
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Tolerancia 6g · Paso normal" style={inp} />
          </label>
          <button onClick={guardar} disabled={busy} style={{ ...btnPri, marginTop: 10 }}>
            {busy ? "Guardando…" : "Guardar selección"}
          </button>
        </div>
      )}
    </div>
  );
}

function AgregarSerie({
  slug, tablasValidadas, onDone, onCancel,
}: {
  slug: string; tablasValidadas: TablaLite[]; onDone: () => void; onCancel: () => void;
}) {
  const [tablaId, setTablaId] = useState("");
  const [sistema, setSistema] = useState<Sistema>("metrico");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const tabla = tablasValidadas.find((t) => t.id === tablaId);

  async function crear() {
    if (!tablaId) { setMsg("Elegí una tabla."); return; }
    setBusy(true); setMsg("");
    // Por defecto incluye todas las filas; se afina con "Editar filas".
    const filas_incluidas = tabla ? tabla.filas.map((_, i) => i) : null;
    const resp = await fetch(`/api/familias/${slug}/series`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabla_normativa_id: tablaId, sistema, filas_incluidas }),
    });
    setBusy(false);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
    onDone();
  }

  return (
    <div style={{ ...card, background: "#f6f7f9" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <label style={{ fontSize: 13 }}>
          Tabla validada
          <select value={tablaId} onChange={(e) => setTablaId(e.target.value)} style={inp}>
            <option value="">— elegir —</option>
            {tablasValidadas.map((t) => (
              <option key={t.id} value={t.id}>{t.norma.codigo} ({t.norma.edicion}) — {t.nombre}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Sistema
          <select value={sistema} onChange={(e) => setSistema(e.target.value as Sistema)} style={inp}>
            <option value="metrico">Métrico</option>
            <option value="pulgadas">Pulgadas</option>
          </select>
        </label>
      </div>
      {tabla && <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{tabla.filas.length} filas. Después seleccionás cuáles entran en el rango.</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <button onClick={crear} disabled={busy} style={btnPri}>{busy ? "Vinculando…" : "Vincular"}</button>
        <button onClick={onCancel} style={btnSec}>Cancelar</button>
        {msg && <span style={{ color: "#b00", fontSize: 13 }}>{msg}</span>}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { border: "1px solid #e3e3e3", borderRadius: 8, padding: 14, marginBottom: 12 };
const inp: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 };
const btnPri: React.CSSProperties = { padding: "8px 14px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" };
const btnSec: React.CSSProperties = { padding: "8px 14px", background: "#eee", color: "#333", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" };
const btnLink: React.CSSProperties = { background: "none", border: 0, color: "#1a4b8c", cursor: "pointer", fontSize: 13, padding: 0 };
