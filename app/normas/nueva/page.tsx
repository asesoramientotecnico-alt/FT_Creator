"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaNormaPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [edicion, setEdicion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg("Adjuntá el PDF"); return; }
    setState("uploading"); setMsg("");

    const resp = await fetch("/api/normas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, edicion, filename: file.name }),
    });
    const json = await resp.json();
    if (!resp.ok) { setState("error"); setMsg(json.error ?? "error"); return; }

    // Subida directa a Storage con el token firmado.
    const { upload, norma } = json as { upload: { signedUrl: string; token: string; path: string }; norma: { id: string } };
    const put = await fetch(upload.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
    if (!put.ok) { setState("error"); setMsg("falló la subida del PDF"); return; }

    router.push(`/normas/${norma.id}`);
  }

  return (
    <main style={{ maxWidth: 520, margin: "6vh auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>Nueva norma</h1>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 13 }}>
          Código
          <input required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ISO 4762" style={inp} />
        </label>
        <label style={{ fontSize: 13 }}>
          Edición
          <input required value={edicion} onChange={(e) => setEdicion(e.target.value)} placeholder="2004" style={inp} />
        </label>
        <label style={{ fontSize: 13 }}>
          PDF de la norma
          <input required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ marginTop: 6, fontSize: 13 }} />
        </label>
        <button
          type="submit"
          disabled={state === "uploading"}
          style={{ padding: "10px 12px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" }}
        >
          {state === "uploading" ? "Subiendo…" : "Crear norma y subir PDF"}
        </button>
      </form>
      {msg && <p style={{ marginTop: 12, color: "#b00", fontSize: 13 }}>{msg}</p>}
    </main>
  );
}

const inp: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 };
