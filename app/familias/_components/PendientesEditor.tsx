"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type Pendiente = {
  id: string;
  tipo: string;
  detalle: string;
  resuelto: boolean;
};

const TIPOS = ["idioma", "faltante", "discrepancia", "extraccion"];

export function PendientesEditor({ slug, pendientes }: { slug: string; pendientes: Pendiente[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("discrepancia");
  const [detalle, setDetalle] = useState("");
  const [busy, setBusy] = useState(false);

  const abiertos = pendientes.filter((p) => !p.resuelto);
  const resueltos = pendientes.filter((p) => p.resuelto);

  async function agregar() {
    if (!detalle.trim()) return;
    setBusy(true);
    await fetch(`/api/familias/${slug}/pendientes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, detalle }),
    });
    setDetalle(""); setBusy(false); router.refresh();
  }

  async function toggle(p: Pendiente) {
    await fetch(`/api/pendientes/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resuelto: !p.resuelto }),
    });
    router.refresh();
  }

  async function eliminar(p: Pendiente) {
    await fetch(`/api/pendientes/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      {abiertos.length === 0 && resueltos.length === 0 && (
        <p style={{ color: "#999", fontSize: 14 }}>Sin pendientes.</p>
      )}

      {abiertos.map((p) => (
        <Row key={p.id} p={p} onToggle={() => toggle(p)} onDelete={() => eliminar(p)} />
      ))}

      {resueltos.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 13, color: "#888", cursor: "pointer" }}>{resueltos.length} resuelto(s)</summary>
          {resueltos.map((p) => (
            <Row key={p.id} p={p} onToggle={() => toggle(p)} onDelete={() => eliminar(p)} />
          ))}
        </details>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6, fontSize: 13 }}>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
          placeholder="Detalle del pendiente"
          style={{ flex: 1, minWidth: 200, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 13 }}
        />
        <button onClick={agregar} disabled={busy} style={{ padding: "6px 12px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Agregar</button>
      </div>
    </div>
  );
}

function Row({ p, onToggle, onDelete }: { p: Pendiente; onToggle: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f0f0f0", opacity: p.resuelto ? 0.55 : 1 }}>
      <input type="checkbox" checked={p.resuelto} onChange={onToggle} />
      <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 10, background: "#eef2f8", color: "#456" }}>{p.tipo}</span>
      <span style={{ flex: 1, fontSize: 14, textDecoration: p.resuelto ? "line-through" : undefined }}>{p.detalle}</span>
      <button onClick={onDelete} style={{ background: "none", border: 0, color: "#b00", cursor: "pointer", fontSize: 13 }}>borrar</button>
    </div>
  );
}
