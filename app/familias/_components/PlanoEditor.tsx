"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Origen = "subido" | "ia" | "ia_redibujado" | null;

export function PlanoEditor({
  slug, svgPath, svgOrigen,
}: { slug: string; svgPath: string | null; svgOrigen: Origen }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"upload" | "ia" | "redibujo" | null>(null);
  const [msg, setMsg] = useState("");
  const [indicacion, setIndicacion] = useState("");

  async function subirManual(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("upload"); setMsg("");
    const resp = await fetch(`/api/familias/${slug}/plano`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    if (!resp.ok) { setBusy(null); setMsg((await resp.json()).error ?? "error"); return; }
    const { upload, publicUrl } = await resp.json();
    const put = await fetch(upload.signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
    if (!put.ok) { setBusy(null); setMsg("falló la subida"); return; }
    await fetch(`/api/familias/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ svg_path: publicUrl, svg_origen: "subido" }),
    });
    setBusy(null); setMsg("Plano actualizado."); router.refresh();
  }

  async function generarIA() {
    setBusy("ia"); setMsg("");
    const fd = new FormData();
    if (indicacion.trim()) fd.append("indicacion", indicacion.trim());
    const resp = await fetch(`/api/familias/${slug}/generar-svg`, { method: "POST", body: fd });
    setBusy(null);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
    setMsg("Plano generado. Iterá si hace falta.");
    router.refresh();
  }

  async function redibujar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("redibujo"); setMsg("");
    const fd = new FormData();
    fd.append("referencia", file);
    if (indicacion.trim()) fd.append("indicacion", indicacion.trim());
    const resp = await fetch(`/api/familias/${slug}/generar-svg`, { method: "POST", body: fd });
    setBusy(null);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
    setMsg("Plano redibujado. Iterá si hace falta.");
    router.refresh();
  }

  const loading = busy !== null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Preview</div>
        {svgPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${svgPath}${svgPath.includes("?") ? "&" : "?"}t=${Date.now()}`} alt="plano" style={{ width: "100%", maxHeight: 240, objectFit: "contain", border: "1px solid #eee", borderRadius: 6, background: "white" }} />
        ) : (
          <div style={{ padding: 30, color: "#999", fontSize: 13, background: "#f6f7f9", borderRadius: 6, textAlign: "center" }}>Sin plano</div>
        )}
        {svgOrigen && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>origen: {svgOrigen}</div>
        )}
      </div>

      <div>
        <label style={{ fontSize: 13 }}>
          Indicación para la IA (opcional, aplica a Generar y Redibujar)
          <textarea
            value={indicacion}
            onChange={(e) => setIndicacion(e.target.value)}
            placeholder="Ej: vista frontal mostrando hexagonal y cuello cilíndrico"
            rows={2}
            style={ta}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          <label style={btnSec}>
            {busy === "upload" ? "Subiendo…" : "Subir SVG / imagen"}
            <input type="file" accept="image/svg+xml,image/png,image/jpeg" onChange={subirManual} disabled={loading} style={{ display: "none" }} />
          </label>

          <button onClick={generarIA} disabled={loading} style={btnPri}>
            {busy === "ia" ? "Generando (30–60s)…" : "Generar con IA"}
          </button>

          <label style={{ ...btnPri, background: "#3a6cb5" }}>
            {busy === "redibujo" ? "Redibujando (30–60s)…" : "Redibujar desde imagen"}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={redibujar} disabled={loading} style={{ display: "none" }} />
          </label>
        </div>

        {msg && <p style={{ fontSize: 13, marginTop: 10, color: msg.includes("Plano") ? "#2a7" : "#b00" }}>{msg}</p>}
        <p style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
          Iterá hasta que el plano te convenga. Cada generación reemplaza el plano anterior en la ficha.
        </p>
      </div>
    </div>
  );
}

const ta: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontFamily: "inherit", resize: "vertical" };
const btnPri: React.CSSProperties = { padding: "8px 14px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center" };
const btnSec: React.CSSProperties = { padding: "8px 14px", background: "#eee", color: "#333", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center" };
