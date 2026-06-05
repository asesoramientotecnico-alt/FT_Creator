# FT_Creator — App de fichas técnicas FAMIQ

Aplicación web interna para cargar, validar y exportar fichas técnicas de bulonería inoxidable. Brief y decisiones en [`CLAUDE.md`](./CLAUDE.md).

## Stack

Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Anthropic API (server-side) · Chromium serverless en Vercel para PDF.

## M1 — Ficha estática end-to-end

### 1. Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL` (formato `https://<ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server-side, nunca al cliente)
- `CHROMIUM_PACK_URL` (solo Vercel; matchea la versión de `@sparticuz/chromium-min`)
- `NEXT_PUBLIC_BASE_URL` (local: `http://localhost:3000`)

### 2. Migrar schema en Supabase

Ejecutar `supabase/migrations/0001_init.sql` contra el proyecto. Opciones:

- Dashboard → SQL Editor → pegar y correr; o
- `psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql`

### 3. Instalar y seed

```bash
npm install
npm run seed     # carga la familia "Allen cabeza cilíndrica" del prototipo
```

### 4. Dev y verificación

```bash
npm run dev
# http://localhost:3000                       → listado
# http://localhost:3000/familias/allen-cabeza-cilindrica          → preview
# http://localhost:3000/familias/allen-cabeza-cilindrica?print=1  → vista print
# http://localhost:3000/api/familias/allen-cabeza-cilindrica/pdf  → PDF
```

Para que el endpoint PDF funcione **en local** necesita Chrome/Chromium instalado y accesible vía `CHROME_PATH` o en una de las rutas estándar (`/usr/bin/google-chrome`, etc.). En Vercel descarga Chromium serverless automáticamente desde `CHROMIUM_PACK_URL`.

## Estructura

```
app/                    rutas Next.js (App Router)
  familias/[slug]/      preview de ficha
  api/familias/[slug]/pdf/   route handler que renderiza el PDF
components/ficha/       <Ficha /> + CSS aislado del prototipo
lib/                    cliente Supabase, tipos, loader
scripts/seed.ts         seed de la familia M1
supabase/migrations/    SQL versionado
public/familias/        SVGs servidos estáticamente (M1)
referencia/             prototipo HTML original (guía visual, no se toca)
```
