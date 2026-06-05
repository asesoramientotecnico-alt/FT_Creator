-- ══════════════════════════════════════════════════════════════
-- FT_Creator — schema inicial (M1)
-- Trazabilidad por esquema: ficha_series.tabla_normativa_id NOT NULL.
-- ══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── normas ────────────────────────────────────────────────────
create table normas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null,
  edicion      text not null,
  pdf_path     text,
  creado_en    timestamptz not null default now(),
  unique(codigo, edicion)
);

-- ── tablas_normativas ─────────────────────────────────────────
create table tablas_normativas (
  id               uuid primary key default gen_random_uuid(),
  norma_id         uuid not null references normas(id) on delete restrict,
  nombre           text not null,
  descripcion      text,
  columnas         jsonb not null,
  filas            jsonb not null,
  estado           text not null default 'borrador'
                   check (estado in ('borrador','validada')),
  extraida_por     text check (extraida_por in ('ia','manual','excel')),
  validada_por     uuid references auth.users(id),
  validada_en      timestamptz,
  notas_extraccion jsonb,
  creado_en        timestamptz not null default now()
);
create index on tablas_normativas (norma_id);
create index on tablas_normativas (estado);

-- ── familias ──────────────────────────────────────────────────
create table familias (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  categoria_num       int,
  categoria_nombre    text,
  subcategoria_num    text,
  subcategoria_nombre text,
  nombre_en           text,
  materiales          text,
  rango_comercial     text,
  presentacion        text,
  descripcion         text,
  descripcion_origen  text check (descripcion_origen in ('ia','humano')),
  aplicaciones        text[] not null default '{}',
  svg_path            text,
  svg_origen          text check (svg_origen in ('subido','ia','ia_redibujado')),
  estado              text not null default 'borrador'
                      check (estado in ('borrador','validada')),
  validada_por        uuid references auth.users(id),
  validada_en         timestamptz,
  creado_en           timestamptz not null default now()
);
create index on familias (estado);

-- ── ficha_series ──────────────────────────────────────────────
-- Vínculo trazabilidad-dura entre una familia y una tabla normativa validada.
create table ficha_series (
  id                  uuid primary key default gen_random_uuid(),
  familia_id          uuid not null references familias(id) on delete cascade,
  tabla_normativa_id  uuid not null references tablas_normativas(id) on delete restrict,
  sistema             text not null check (sistema in ('metrico','pulgadas')),
  nota                text,
  orden               int not null default 0
);
create index on ficha_series (familia_id);

-- ── pendientes ────────────────────────────────────────────────
create table pendientes (
  id            uuid primary key default gen_random_uuid(),
  familia_id    uuid not null references familias(id) on delete cascade,
  tipo          text not null check (tipo in ('idioma','faltante','discrepancia','extraccion')),
  detalle       text not null,
  resuelto      bool not null default false,
  resuelto_por  uuid references auth.users(id),
  creado_en     timestamptz not null default now()
);
create index on pendientes (familia_id, resuelto);

-- ══════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════
alter table normas             enable row level security;
alter table tablas_normativas  enable row level security;
alter table familias           enable row level security;
alter table ficha_series       enable row level security;
alter table pendientes         enable row level security;

-- Mientras no afinemos roles: cualquier usuario autenticado lee/escribe.
-- En M1 además permitimos lectura anónima para poder ver la ficha sin login;
-- esto se ajustará al introducir Auth (M3/M5).
do $$
declare t text;
begin
  foreach t in array array['normas','tablas_normativas','familias','ficha_series','pendientes'] loop
    execute format('create policy "%s_read_all" on %I for select using (true);', t, t);
    execute format('create policy "%s_write_auth" on %I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end$$;
