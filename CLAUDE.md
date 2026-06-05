# App de fichas técnicas — Bulonería FAMIQ (v2)

Brief para Claude Code. Reemplaza al brief v1 (pipeline batch): el diseño cambió a aplicación web multiusuario. Las decisiones de este documento están cerradas; no redefinir sin consultar.

## Objetivo

Aplicación web interna donde el equipo de Oficina Técnica carga y valida los datos de cada familia de bulonería inoxidable, y el sistema genera la ficha técnica en PDF (y el catálogo unificado). Cada valor dimensional es trazable a su norma (código + edición + tabla); la trazabilidad se garantiza en el modelo de datos, no por convención.

## Stack

- **Next.js** (App Router) desplegado en **Vercel**
- **Supabase**: Postgres (datos), Auth (usuarios del equipo, email/password o magic link), Storage (PDFs de normas, SVGs, PDFs generados)
- **API de Anthropic** desde route handlers server-side (la key nunca llega al cliente)
- **PDF**: Chromium serverless en Vercel (`@sparticuz/chromium-min` + `playwright-core` o `puppeteer-core`) renderizando la vista de ficha, que ya tiene CSS de impresión A4
- Repo en GitHub solo para código y deploy (CI de Vercel); los usuarios finales no interactúan con GitHub

## Principio rector: trazabilidad por esquema

Una serie dimensional de una ficha referencia obligatoriamente (`NOT NULL`) una tabla normativa validada. No existe forma de guardar cotas sin fuente. La edición de valores es siempre estructurada (formularios, pegado parseado desde Excel); nunca texto libre tipo `contenteditable`.

## Modelo de datos (Postgres)

```sql
normas (
  id, codigo text,            -- "ISO 4762"
  edicion text,               -- "2004"
  pdf_path text,              -- Storage
  unique(codigo, edicion)
)

tablas_normativas (
  id, norma_id fk not null,
  nombre text,                -- "Tabla 1 — paso grueso"
  descripcion text,
  columnas jsonb,             -- definición de columnas (id, label, con_tolerancia)
  filas jsonb,                -- valores: { d: "M6", dk: {nom, max, min}, ... }
  estado text check (estado in ('borrador','validada')),
  extraida_por text,          -- 'ia' | 'manual' | 'excel'
  validada_por uuid fk users, validada_en timestamptz,
  notas_extraccion jsonb      -- celdas dudosas marcadas por la IA
)

familias (
  id, slug text unique,       -- "tuerca-hexagonal"
  categoria_num int, categoria_nombre text,
  subcategoria_num text, subcategoria_nombre text, nombre_en text,
  materiales text, rango_comercial text,  -- filtra filas de la tabla normativa
  presentacion text,
  descripcion text, descripcion_origen text,   -- 'ia' | 'humano'
  aplicaciones text[],
  svg_path text, svg_origen text,              -- 'subido' | 'ia' | 'ia_redibujado'
  estado text check (estado in ('borrador','validada')),
  validada_por uuid, validada_en timestamptz
)

ficha_series (
  id, familia_id fk not null,
  tabla_normativa_id fk not null,   -- ⟵ trazabilidad dura
  sistema text,                     -- 'metrico' | 'pulgadas'
  nota text,                        -- "Tolerancia 6g · Paso normal"
  orden int
)

pendientes (
  id, familia_id fk,
  tipo text,                  -- 'idioma' | 'faltante' | 'discrepancia' | 'extraccion'
  detalle text,
  resuelto bool default false, resuelto_por uuid
)
```

RLS de Supabase activado; todos los usuarios autenticados del equipo leen/escriben (afinar roles después si hace falta).

## Pantallas

### 1. /normas — biblioteca normativa
- Lista de normas cargadas con estado de sus tablas.
- "Nueva norma": subir PDF → el usuario puede indicar qué tabla extraer (texto libre: "Tabla 1, paso grueso") o pedir que la IA liste las tablas dimensionales que encuentra y elegir.
- Extracción IA → pantalla de revisión lado a lado: visor del PDF (página de la tabla) a la izquierda, tabla editable a la derecha. Celdas que la IA marcó dudosas, resaltadas. El usuario corrige inline.
- Botón "Validar tabla" → estado `validada`, registra usuario y fecha. Solo tablas validadas son seleccionables desde las fichas.
- Re-extracción o nueva edición de norma crea registros nuevos, nunca pisa una tabla validada.

### 2. /familias — listado y alta
- Grid de familias con estado (borrador / validada) y acceso a su ficha.
- "Nueva familia": formulario de datos comerciales (categoría, nombres, materiales, rango comercial, presentación) + selector de tablas normativas validadas por sistema (métrico / pulgadas). Si la norma no está, link a /normas para cargarla primero.

### 3. /familias/[slug] — editor de ficha (la pantalla central)
Secciones, cada una con su estado y validación:
- **Datos generales**: el formulario del alta, editable.
- **Plano**: tres caminos en la misma sección:
  a) subir/pegar imagen o SVG propio;
  b) "Generar con IA": genera SVG esquemático con cotas letra según la geometría de la familia;
  c) "Redibujar": el usuario sube un boceto/foto/captura de referencia y la IA lo redibuja como SVG en el formato estándar del catálogo.
  Preview siempre visible; iterar hasta validar.
- **Series dimensionales**: muestra las filas de la tabla normativa vinculada, filtradas por rango comercial. Filas del rango que la norma no define → marcadas `faltante` (van a pendientes). El usuario no edita valores acá: si un valor está mal, se corrige en la tabla normativa (fuente única).
- **Textos**: descripción y aplicaciones; botón "Sugerir con IA", edición inline, se registra origen.
- **Pendientes**: lista de dudas (idioma, faltantes, discrepancias) a resolver antes de validar.
- **Preview**: la ficha renderizada (mismo HTML del PDF), siempre visible o en tab.

### 4. Export
- "Generar PDF" por familia: habilitado solo con todo validado y pendientes resueltos; antes de eso exporta con marca de agua BORRADOR.
- /catalogo: seleccionar familias validadas → PDF unificado con portada + índice (estructura del prototipo de referencia).

## Integración con IA (route handlers)

- `POST /api/extraer-tabla`: PDF (desde Storage) + indicación de tabla → Claude con el documento → JSON de columnas/filas + `notas_extraccion` con celdas dudosas. Prompt con instrucción dura: nunca inventar valores; celda ilegible = null + nota.
- `POST /api/generar-svg`: geometría/familia (+ imagen de referencia opcional) → SVG en el estilo del catálogo (cotas letra, línea de cota con flechas, paleta FAMIQ).
- `POST /api/sugerir-textos`: datos de la familia → descripción + aplicaciones en castellano; términos habituales en inglés se devuelven como pendiente de tipo `idioma`, no se decide solo.
- Todos devuelven borradores: nada generado por IA queda `validado` sin acción humana.

## Template de ficha

- Base: estructura y CSS del prototipo de referencia (en `/referencia/` del repo): header azul categoría/subcategoría, plano SVG + columna info, tabla de cotas con secciones por sistema, pie.
- Es un componente React que sirve para: preview en el editor, página imprimible, y render del PDF (misma fuente, cero divergencia).
- Tolerancias: las celdas muestran nominal y máx/mín cuando la tabla normativa los define.
- Coma decimal en presentación (es-AR); punto en datos.
- Quitar todo rastro del modo edición del prototipo (contenteditable, botones, localStorage).
- La identidad visual FAMIQ se refina después; no bloquear por estética.

## Idioma

Todo en castellano. Términos de uso habitual en inglés (ej. "Hex Nut" como subtítulo) quedan como pendiente para decisión humana por familia.

## Milestones

**M1 — Ficha estática end-to-end**
Proyecto Next.js + Supabase con schema migrado; componente de ficha derivado del prototipo; una familia (Allen cabeza cilíndrica) cargada vía seed con datos del prototipo; export PDF serverless funcionando. Criterio: PDF visualmente equivalente a `referencia/ficha_1_1_allen_cabeza_cilindrica.html`.

**M2 — Normas + extracción IA**
Pantalla /normas completa: subida de PDF, extracción con Claude, revisión lado a lado, validación. Criterio: cargar ISO 4762 real de punta a punta y que la ficha de M1 pase a referenciar la tabla validada.

**M3 — Editor de familias**
Alta y edición completa: datos generales, vínculo a tablas validadas, rango comercial, textos con IA, pendientes, estados y validación con registro de usuario.

**M4 — Plano asistido**
Los tres caminos del SVG (subir / generar / redibujar) con preview e iteración.

**M5 — Catálogo y equipo**
Export de catálogo unificado, auth del equipo afinada, marca de agua BORRADOR, pulido visual FAMIQ.

## Lo que NO hacer

- No inventar valores dimensionales: celda sin fuente validada no existe en una ficha.
- No permitir edición de cotas a nivel ficha: se corrigen en la tabla normativa.
- No exponer la API key de Anthropic al cliente.
- No usar contenteditable ni localStorage como almacenamiento.
- No habilitar PDF final con pendientes abiertos o secciones en borrador.
