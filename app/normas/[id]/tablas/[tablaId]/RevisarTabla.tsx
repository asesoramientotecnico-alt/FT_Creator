"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnaTabla, FilaTabla, NotaExtraccion, Estado } from "@/lib/types";

type Props = {
  tablaId: string;
  normaCodigo: string;
  pdfUrl: string | null;
  initial: {
    nombre: string;
    descripcion: string | null;
    columnas: ColumnaTabla[];
    filas: FilaTabla[];
    notas_extraccion: NotaExtraccion[];
    estado: Estado;
  };
};

// Convertir { nom, max, min } a string editable y volver.
function celdaToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && "nom" in (v as object)) {
    const o = v as { nom: unknown; max?: unknown; min?: unknown };
    const nom = o.nom ?? "";
    const max = o.max != null ? `↑${o.max}` : "";
    const min = o.min != null ? `↓${o.min}` : "";
    return [nom, max, min].filter(Boolean).join(" ");
  }
  return String(v);
}

function parseCelda(s: string, conTolerancia: boolean): unknown {
  const t = s.trim();
  if (t === "") return null;
  if (conTolerancia) {
    // Formato "nom ↑max ↓min" (cualquiera opcional). Tolerantes: + para max, - para min.
    const re = /^([^↑↓+\-]+)?\s*(?:[↑+]([^\s↓\-]+))?\s*(?:[↓\-]([^\s↑+]+))?$/;
    const m = t.match(re);
    if (m) {
      const nom = m[1]?.trim() ?? null;
      const max = m[2]?.trim() ?? undefined;
      const min = m[3]?.trim() ?? undefined;
      if (max !== undefined || min !== undefined) {
        const num = (x: string | undefined) => (x === undefined ? undefined : isNaN(Number(x)) ? x : Number(x));
        return { nom: nom === null ? null : (isNaN(Number(nom)) ? nom : Number(nom)), max: num(max), min: num(min) };
      }
      return isNaN(Number(t)) ? t : Number(t);
    }
  }
  return isNaN(Number(t)) ? t : Number(t);
}

export function RevisarTabla({ tablaId, normaCodigo, pdfUrl, initial }: Props) {
  const router = useRouter();
  const [columnas] = useState<ColumnaTabla[]>(initial.columnas);
  const [filas, setFilas] = useState<FilaTabla[]>(initial.filas);
  const [nombre, setNombre] = useState(initial.nombre);
  const [notas] = useState<NotaExtraccion[]>(initial.notas_extraccion);
  const [estado, setEstado] = useState<Estado>(initial.estado);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const validada = estado === "validada";

  // Mapa de celdas dudosas: "fila|col" → motivo.
  const dudosas = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notas) m.set(`${n.fila}|${n.columna}`, n.motivo);
    return m;
  }, [notas]);

  function updateCelda(fIdx: number, colId: string, raw: string, conTolerancia: boolean) {
    setFilas((prev) => {
      const next = prev.slice();
      next[fIdx] = { ...next[fIdx], [colId]: parseCelda(raw, conTolerancia) as never };
      return next;
    });
  }

  async function guardar() {
    setSaving(true); setMsg("");
    const resp = await fetch(`/api/tablas-normativas/${tablaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, filas }),
    });
    setSaving(false);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error al guardar"); return; }
    setMsg("Guardado.");
  }

  async function validar() {
    if (!confirm("¿Validar esta tabla? Una vez validada no se puede editar.")) return;
    setSaving(true); setMsg("");
    // Guardamos pendientes antes de validar.
    await fetch(`/api/tablas-normativas/${tablaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, filas }),
    });
    const resp = await fetch(`/api/tablas-normativas/${tablaId}/validar`, { method: "POST" });
    setSaving(false);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error al validar"); return; }
    setEstado("validada");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "calc(100vh - 80px)" }}>
      <section style={{ display: "flex", flexDirection: "column", border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
        <header style={{ padding: "8px 12px", background: "#f6f7f9", fontSize: 13, color: "#666" }}>PDF — {normaCodigo}</header>
        {pdfUrl ? (
          <iframe src={pdfUrl} style={{ flex: 1, border: 0 }} />
        ) : (
          <div style={{ padding: 16, color: "#999" }}>Sin PDF asociado.</div>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
        <header style={{ padding: "8px 12px", background: "#f6f7f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={validada}
            style={{ flex: 1, fontSize: 14, fontWeight: 600, border: "1px solid transparent", background: "transparent", padding: "4px 6px" }}
          />
          <span style={{ fontSize: 12, color: validada ? "#2a7" : "#c80" }}>{estado}</span>
          {!validada && (
            <>
              <button onClick={guardar} disabled={saving} style={btnSec}>Guardar</button>
              <button onClick={validar} disabled={saving} style={btnPri}>Validar tabla</button>
            </>
          )}
        </header>
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, background: "#fff", boxShadow: "inset 0 -1px 0 #ddd" }}>
              <tr>
                <th style={th}>#</th>
                {columnas.map((c) => (
                  <th key={c.id} style={th}>
                    {c.label}
                    {c.sub && <div style={{ fontWeight: 400, color: "#888", fontSize: 11 }}>{c.sub}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, fIdx) => (
                <tr key={fIdx}>
                  <td style={{ ...td, color: "#999", textAlign: "right" }}>{fIdx + 1}</td>
                  {columnas.map((c) => {
                    const dudosa = dudosas.get(`${fIdx}|${c.id}`);
                    return (
                      <td key={c.id} style={{ ...td, background: dudosa ? "#fff4cc" : undefined }} title={dudosa ?? undefined}>
                        <input
                          value={celdaToString(fila[c.id])}
                          onChange={(e) => updateCelda(fIdx, c.id, e.target.value, !!c.con_tolerancia)}
                          disabled={validada}
                          style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px 6px", fontSize: 13 }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {msg && <footer style={{ padding: "8px 12px", borderTop: "1px solid #eee", fontSize: 13 }}>{msg}</footer>}
        {!validada && (
          <footer style={{ padding: "6px 12px", borderTop: "1px solid #eee", fontSize: 12, color: "#888" }}>
            Celdas con fondo amarillo: la IA las marcó como dudosas. Tolerancias en formato <code>nom ↑max ↓min</code>.
          </footer>
        )}
      </section>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 12, color: "#444", borderBottom: "1px solid #ddd" };
const td: React.CSSProperties = { padding: 0, borderBottom: "1px solid #f0f0f0", verticalAlign: "middle" };
const btnPri: React.CSSProperties = { padding: "6px 10px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 4, fontSize: 13, cursor: "pointer" };
const btnSec: React.CSSProperties = { padding: "6px 10px", background: "#eee", color: "#333", border: 0, borderRadius: 4, fontSize: 13, cursor: "pointer" };
