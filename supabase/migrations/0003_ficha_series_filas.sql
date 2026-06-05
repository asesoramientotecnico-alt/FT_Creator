-- ══════════════════════════════════════════════════════════════
-- M3b — Selección manual de filas por serie dimensional
-- filas_incluidas: array de índices (posición en tablas_normativas.filas)
-- que entran en el rango comercial de la familia.
-- NULL = todas las filas (compat con series cargadas antes de M3b).
-- ══════════════════════════════════════════════════════════════

alter table ficha_series
  add column if not exists filas_incluidas jsonb;
