"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExtraerForm({ normaId }: { normaId: string }) {
  const router = useRouter();
  const [indicacion, setIndicacion] = useState("");
  const [state, setState] = useState<"idle" | "extracting" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("extracting"); setMsg("");
    const resp = await fetch("/api/extraer-tabla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ norma_id: normaId, indicacion }),
    });
    const json = await resp.json();
    if (!resp.ok) { setState("error"); setMsg(json.error ?? "error"); return; }
    router.push(`/normas/${normaId}/tablas/${json.tabla_id}`);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input
        required
        value={indicacion}
        onChange={(e) => setIndicacion(e.target.value)}
        placeholder='Ej: "Tabla 1, paso grueso"'
        style={{ flex: 1, minWidth: 220, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 }}
        disabled={state === "extracting"}
      />
      <button
        type="submit"
        disabled={state === "extracting"}
        style={{ padding: "8px 14px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" }}
      >
        {state === "extracting" ? "Extrayendo (puede tardar 30–60s)…" : "Extraer con IA"}
      </button>
      {msg && <p style={{ width: "100%", color: "#b00", fontSize: 13 }}>{msg}</p>}
    </form>
  );
}
