"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = supabaseBrowser();
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });
    if (error) {
      setState("error");
      setMsg(error.message);
    } else {
      setState("sent");
      setMsg("Revisá tu casilla.");
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input
        type="email"
        required
        placeholder="vos@famiq.com.ar"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "sending" || state === "sent"}
        style={{ padding: "10px 12px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 }}
      />
      <button
        type="submit"
        disabled={state === "sending" || state === "sent"}
        style={{ padding: "10px 12px", background: "#1a4b8c", color: "white", border: 0, borderRadius: 6, fontSize: 14, cursor: "pointer" }}
      >
        {state === "sending" ? "Enviando…" : state === "sent" ? "Link enviado" : "Recibir link de acceso"}
      </button>
      {msg && <p style={{ color: state === "error" ? "#b00" : "#2a7" }}>{msg}</p>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "8vh auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>FAMIQ — Fichas técnicas</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Ingresá tu email del equipo. Te enviamos un link de acceso.
      </p>
      <Suspense fallback={<p>Cargando…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
