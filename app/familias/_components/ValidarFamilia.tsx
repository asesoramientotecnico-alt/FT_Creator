"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ValidarFamilia({ slug, estado }: { slug: string; estado: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function validar() {
    setBusy(true); setMsg("");
    const resp = await fetch(`/api/familias/${slug}/validar`, { method: "POST" });
    setBusy(false);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
    router.refresh();
  }

  async function reabrir() {
    if (!confirm("¿Volver la familia a borrador?")) return;
    setBusy(true); setMsg("");
    await fetch(`/api/familias/${slug}/validar`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  if (estado === "validada") {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ color: "#2a7", fontSize: 14 }}>✓ Familia validada</span>
        <button onClick={reabrir} disabled={busy} style={btnSec}>Volver a borrador</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={validar} disabled={busy} style={btnPri}>{busy ? "…" : "Validar familia"}</button>
      <span style={{ fontSize: 13, color: "#888" }}>Requiere ≥1 serie y sin pendientes abiertos.</span>
      {msg && <span style={{ fontSize: 13, color: "#b00" }}>{msg}</span>}
    </div>
  );
}

const btnPri: React.CSSProperties = { padding: "8px 16px", background: "#2a7", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" };
const btnSec: React.CSSProperties = { padding: "6px 12px", background: "#eee", color: "#333", border: 0, borderRadius: 6, fontSize: 13, cursor: "pointer" };
