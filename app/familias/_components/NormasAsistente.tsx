"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Sugerida = {
  codigo: string;
  titulo: string;
  motivo: string;
  en_biblioteca: boolean;
  tabla_validada: boolean;
  ya_vinculada: boolean;
};
type Cobertura = { tiene_dimensional: boolean; tiene_pruebas: boolean; faltan: string[] };
type Resultado = {
  dimensional_fabricacion: Sugerida[];
  pruebas_ensayo: Sugerida[];
  cobertura: Cobertura;
};

const ETIQUETA: Record<string, string> = {
  dimensional_fabricacion: "dimensional / fabricación",
  pruebas_ensayo: "pruebas / ensayo",
};

export function NormasAsistente({ slug }: { slug: string }) {
  const router = useRouter();
  const [res, setRes] = useState<Resultado | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sugerir() {
    setBusy(true); setMsg("");
    const resp = await fetch(`/api/familias/${slug}/sugerir-normas`, { method: "POST" });
    setBusy(false);
    if (!resp.ok) { setMsg((await resp.json()).error ?? "error"); return; }
    setRes(await resp.json());
  }

  async function crearPendientesFaltantes() {
    if (!res) return;
    setBusy(true);
    for (const cat of res.cobertura.faltan) {
      await fetch(`/api/familias/${slug}/pendientes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "faltante", detalle: `Falta norma ${ETIQUETA[cat] ?? cat}.` }),
      });
    }
    setBusy(false);
    setMsg("Pendientes creados.");
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={sugerir} disabled={busy} style={btnSec}>{busy ? "Analizando…" : "Sugerir normas con IA"}</button>
        {msg && <span style={{ fontSize: 13, color: msg.includes("creados") ? "#2a7" : "#b00" }}>{msg}</span>}
      </div>

      {res && (
        <div style={{ marginTop: 14 }}>
          {/* Cobertura */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "10px 12px", background: "#f6f7f9", borderRadius: 6, fontSize: 13 }}>
            <Cob ok={res.cobertura.tiene_dimensional} label="Dimensional / fabricación" />
            <Cob ok={res.cobertura.tiene_pruebas} label="Pruebas / ensayo" />
            {res.cobertura.faltan.length > 0 && (
              <button onClick={crearPendientesFaltantes} disabled={busy} style={{ ...btnLink, marginLeft: "auto" }}>
                Crear pendiente(s) por faltantes
              </button>
            )}
          </div>

          <Grupo titulo="Dimensionales de fabricación" items={res.dimensional_fabricacion} />
          <Grupo titulo="De pruebas / ensayo" items={res.pruebas_ensayo} />

          <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
            Sugerencias de IA: verificá el código y la edición antes de cargarlas. Para vincular una norma a la ficha,
            primero cargala y validá su tabla en <a href="/normas">Normas</a>.
          </p>
        </div>
      )}
    </div>
  );
}

function Cob({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ color: ok ? "#2a7" : "#c0392b", fontWeight: 600 }}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function Grupo({ titulo, items }: { titulo: string; items: Sugerida[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{titulo}</div>
      {items.map((n) => (
        <div key={n.codigo} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{n.codigo}</strong>
            <span style={{ color: "#666", fontSize: 13 }}>{n.titulo}</span>
            {n.ya_vinculada ? (
              <Badge color="#2a7">vinculada</Badge>
            ) : n.tabla_validada ? (
              <Badge color="#1a4b8c">lista para vincular</Badge>
            ) : n.en_biblioteca ? (
              <Badge color="#c80">en biblioteca, sin tabla validada</Badge>
            ) : (
              <Badge color="#999">no cargada</Badge>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{n.motivo}</div>
        </div>
      ))}
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 10, color: "white", background: color }}>{children}</span>;
}

const btnSec: React.CSSProperties = { padding: "8px 14px", background: "#eee", color: "#333", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" };
const btnLink: React.CSSProperties = { background: "none", border: 0, color: "#1a4b8c", cursor: "pointer", fontSize: 13, padding: 0 };
