import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/normas — crea registro y devuelve signed URL para subir el PDF a Storage.
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    codigo?: string; edicion?: string; filename?: string;
  };
  const codigo = body.codigo?.trim();
  const edicion = body.edicion?.trim();
  const filename = body.filename?.trim();
  if (!codigo || !edicion || !filename) {
    return NextResponse.json({ error: "codigo, edicion y filename son requeridos" }, { status: 400 });
  }

  const path = `${codigo.replace(/[^\w-]+/g, "_")}_${edicion.replace(/[^\w-]+/g, "_")}/${Date.now()}_${filename}`;

  const { data: signed, error: eSign } = await sb.storage
    .from("normas")
    .createSignedUploadUrl(path);
  if (eSign || !signed) {
    return NextResponse.json({ error: eSign?.message ?? "no se pudo firmar la URL" }, { status: 500 });
  }

  const { data: norma, error: eIns } = await sb
    .from("normas")
    .insert({ codigo, edicion, pdf_path: path })
    .select("id, codigo, edicion, pdf_path")
    .single();
  if (eIns) {
    return NextResponse.json({ error: eIns.message }, { status: 400 });
  }

  return NextResponse.json({ norma, upload: signed });
}
