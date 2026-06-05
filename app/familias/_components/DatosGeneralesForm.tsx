"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type DatosFamilia = {
  categoria_num: number | null;
  categoria_nombre: string | null;
  subcategoria_num: string | null;
  subcategoria_nombre: string | null;
  nombre_en: string | null;
  materiales: string | null;
  rango_comercial: string | null;
  presentacion: string | null;
};

const CAMPOS: { key: keyof DatosFamilia; label: string; type?: string; textarea?: boolean; ph?: string }[] = [
  { key: "categoria_num", label: "Categoría (número)", type: "number", ph: "1" },
  { key: "categoria_nombre", label: "Categoría (nombre)", ph: "Tornillos" },
  { key: "subcategoria_num", label: "Subcategoría (número)", ph: "1.1" },
  { key: "subcategoria_nombre", label: "Subcategoría (nombre)", ph: "Cabeza cilíndrica" },
  { key: "nombre_en", label: "Nombre en inglés (opcional)", ph: "Socket head cap screw" },
  { key: "materiales", label: "Materiales", textarea: true, ph: "A2-70\nA4-80" },
  { key: "rango_comercial", label: "Rango comercial (descriptivo)", ph: "M3 a M30" },
  { key: "presentacion", label: "Presentación", ph: "Caja x 100" },
];

export function DatosGeneralesForm({
  mode,
  slug,
  initial,
}: {
  mode: "nueva" | "editar";
  slug?: string;
  initial?: DatosFamilia;
}) {
  const router = useRouter();
  const [vals, setVals] = useState<DatosFamilia>(
    initial ?? {
      categoria_num: null, categoria_nombre: null, subcategoria_num: null,
      subcategoria_nombre: null, nombre_en: null, materiales: null,
      rango_comercial: null, presentacion: null,
    }
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function set(key: keyof DatosFamilia, value: string) {
    setVals((p) => ({ ...p, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vals.subcategoria_nombre?.trim()) { setMsg("La subcategoría (nombre) es requerida."); return; }
    setSaving(true); setMsg("");

    if (mode === "nueva") {
      const resp = await fetch("/api/familias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vals),
      });
      const json = await resp.json();
      setSaving(false);
      if (!resp.ok) { setMsg(json.error ?? "error"); return; }
      router.push(`/familias/${json.slug}`);
    } else {
      const resp = await fetch(`/api/familias/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vals),
      });
      setSaving(false);
      if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
      setMsg("Guardado.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {CAMPOS.map((c) => (
        <label key={c.key} style={{ fontSize: 13, gridColumn: c.textarea ? "1 / -1" : undefined }}>
          {c.label}
          {c.textarea ? (
            <textarea
              value={(vals[c.key] as string) ?? ""}
              onChange={(e) => set(c.key, e.target.value)}
              placeholder={c.ph}
              rows={2}
              style={ta}
            />
          ) : (
            <input
              type={c.type ?? "text"}
              value={(vals[c.key] as string | number) ?? ""}
              onChange={(e) => set(c.key, e.target.value)}
              placeholder={c.ph}
              style={inp}
            />
          )}
        </label>
      ))}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={saving} style={btn}>
          {saving ? "Guardando…" : mode === "nueva" ? "Crear familia" : "Guardar datos generales"}
        </button>
        {msg && <span style={{ fontSize: 13, color: msg === "Guardado." ? "#2a7" : "#b00" }}>{msg}</span>}
      </div>
    </form>
  );
}

const inp: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 };
const ta: React.CSSProperties = { ...inp, fontFamily: "inherit", resize: "vertical" };
const btn: React.CSSProperties = { padding: "10px 16px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" };
