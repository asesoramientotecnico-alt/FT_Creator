"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export function SignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      style={{ background: "none", border: 0, color: "#1a4b8c", cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}
    >
      Salir
    </button>
  );
}
