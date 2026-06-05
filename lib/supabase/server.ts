import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para Server Components / Route Handlers que usa la cookie de sesión.
// Respeta RLS: queda autenticado como el usuario que hizo el request.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          // En server components no podemos setear cookies; el middleware se ocupa del refresh.
          try {
            toSet.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* noop en server components */
          }
        },
      },
    }
  );
}

// Cliente con service-role, server-only. Bypassea RLS — usar solo en operaciones admin
// (ej. crear buckets, seed). NUNCA exponer al cliente.
import { createClient } from "@supabase/supabase-js";
export const supabaseService = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
