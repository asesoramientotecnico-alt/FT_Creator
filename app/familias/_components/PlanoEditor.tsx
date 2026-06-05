"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanoEditor({ slug, svgPath }: { slug: string; svgPath: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg("");

    const resp = await fetch(`/api/familias/${slug}/plano`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    if (!resp.ok) { setBusy(false); setMsg((await resp.json()).error ?? "error"); return; }
    const { upload, publicUrl } = await resp.json();

    const put = await fetch(upload.signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
    if (!put.ok) { setBusy(false); setMsg("falló la subida"); return; }

    await fetch(`/api/familias/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ svg_path: publicUrl, svg_origen: "subido" }),
    });
    setBusy(false);
    setMsg("Plano actualizado.");
    router.refresh();
  }

  return (
    <div>
      {svgPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={svgPath} alt="plano" style={{ maxWidth: 280, maxHeight: 200, border: "1px solid #eee", borderRadius: 6, background: "white" }} />
      ) : (
        <p style={{ color: "#999", fontSize: 14 }}>Sin plano cargado.</p>
      )}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 13 }}>
          Subir SVG o imagen
          <input type="file" accept="image/svg+xml,image/png,image/jpeg" onChange={onFile} disabled={busy} style={{ display: "block", marginTop: 6, fontSize: 13 }} />
        </label>
        <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>Generar/redibujar con IA llega en M4.</p>
        {msg && <span style={{ fontSize: 13, color: msg.includes("actualizado") ? "#2a7" : "#b00" }}>{msg}</span>}
      </div>
    </div>
  );
}
