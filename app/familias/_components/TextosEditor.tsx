"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TextosEditor({
  slug,
  initialDescripcion,
  initialAplicaciones,
  initialOrigen,
}: {
  slug: string;
  initialDescripcion: string | null;
  initialAplicaciones: string[];
  initialOrigen: string | null;
}) {
  const router = useRouter();
  const [descripcion, setDescripcion] = useState(initialDescripcion ?? "");
  const [aplicaciones, setAplicaciones] = useState<string[]>(initialAplicaciones ?? []);
  const [origen, setOrigen] = useState<string | null>(initialOrigen);
  const [nuevaApp, setNuevaApp] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sugerir() {
    setBusy(true); setMsg("");
    const resp = await fetch("/api/sugerir-textos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setBusy(false);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
    const j = await resp.json();
    setDescripcion(j.descripcion ?? "");
    setAplicaciones(j.aplicaciones ?? []);
    setOrigen("ia");
    // Términos en inglés → pendientes de idioma (decisión humana).
    const pend: { termino: string; sugerencia: string }[] = j.pendientes_idioma ?? [];
    for (const p of pend) {
      await fetch(`/api/familias/${slug}/pendientes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "idioma", detalle: `Término "${p.termino}" — sugerencia: ${p.sugerencia}` }),
      });
    }
    setMsg(pend.length ? `Sugerido. Se crearon ${pend.length} pendiente(s) de idioma.` : "Sugerido (borrador). Revisá y guardá.");
    router.refresh();
  }

  async function guardar() {
    setBusy(true); setMsg("");
    const resp = await fetch(`/api/familias/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descripcion, aplicaciones, descripcion_origen: origen ?? "humano" }),
    });
    setBusy(false);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
    setMsg("Guardado.");
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={sugerir} disabled={busy} style={btnSec}>{busy ? "…" : "Sugerir con IA"}</button>
        {origen && <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>origen: {origen}</span>}
      </div>

      <label style={{ fontSize: 13 }}>
        Descripción
        <textarea
          value={descripcion}
          onChange={(e) => { setDescripcion(e.target.value); setOrigen("humano"); }}
          rows={3}
          style={ta}
        />
      </label>

      <div style={{ fontSize: 13, marginTop: 12 }}>Aplicaciones</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {aplicaciones.map((a, i) => (
          <span key={i} style={tag}>
            {a}
            <button onClick={() => setAplicaciones((p) => p.filter((_, j) => j !== i))} style={tagX}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={nuevaApp}
          onChange={(e) => setNuevaApp(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (nuevaApp.trim()) { setAplicaciones((p) => [...p, nuevaApp.trim()]); setNuevaApp(""); } } }}
          placeholder="Agregar aplicación + Enter"
          style={{ ...inp, marginTop: 0, flex: 1 }}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={guardar} disabled={busy} style={btnPri}>Guardar textos</button>
        {msg && <span style={{ fontSize: 13, color: msg.startsWith("Guardado") || msg.startsWith("Sugerido") ? "#2a7" : "#b00" }}>{msg}</span>}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 };
const ta: React.CSSProperties = { ...inp, fontFamily: "inherit", resize: "vertical" };
const tag: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", background: "#eef2f8", borderRadius: 14, fontSize: 13 };
const tagX: React.CSSProperties = { background: "none", border: 0, color: "#999", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 };
const btnPri: React.CSSProperties = { padding: "8px 14px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" };
const btnSec: React.CSSProperties = { padding: "8px 14px", background: "#eee", color: "#333", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" };
