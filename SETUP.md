# SETUP — Runner self-hosted y ejecución

Este pipeline **no se ejecuta en la máquina del usuario**: corre en GitHub Actions
sobre un **runner self-hosted** (mismo patrón e infraestructura que el sistema de
auditoría existente). El usuario interactúa solo vía navegador (GitHub web + Claude
Code web).

> Estado actual: **el runner self-hosted todavía NO está registrado para este repo.**
> Los workflows ya están escritos (`.github/workflows/`) y esperan un runner con la
> label `ft-creator`. Hasta que exista, los workflows no correrán. Este documento
> explica qué instalar y cómo registrarlo.

---

## 1. Requisitos de la máquina del runner

- Linux x86_64 (o el SO del runner de auditoría existente).
- **Python 3.11+** (`python3 --version`).
- `pip` actualizado.
- Dependencias de sistema de Chromium para Playwright (fuentes, libs gráficas).
- Salida a internet para descargar dependencias y las fuentes web (DM Sans /
  DM Serif Display). Si el runner es offline, ver §5 (fuentes).

## 2. Instalación (una sola vez en el runner)

```bash
# 1. Clonar / ubicarse en el repo (lo hace el step de checkout en cada corrida,
#    pero las dependencias se instalan una vez a nivel de runner).
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

# 2. Navegador para el render HTML -> PDF
playwright install chromium

# 3. Dependencias de sistema de Chromium (Debian/Ubuntu).
#    Alternativamente: `playwright install-deps chromium`
sudo playwright install-deps chromium
```

Verificación rápida:

```bash
python3 scripts/validar.py
python3 scripts/generar_ficha.py allen-cabeza-cilindrica
python3 scripts/render_pdf.py
# -> output/borrador/allen-cabeza-cilindrica.pdf
```

## 3. Registrar el runner en el repo

En GitHub: **Settings → Actions → Runners → New self-hosted runner**, elegir SO y
seguir los pasos (`./config.sh ...` + `./run.sh`). Al configurarlo:

- Asignar las **labels**: `self-hosted` (automática) y **`ft-creator`** (la que
  usan los workflows en `runs-on: [self-hosted, ft-creator]`).
- Recomendado: instalarlo como servicio (`./svc.sh install && ./svc.sh start`) para
  que sobreviva reinicios.

Si se reutiliza el runner del sistema de auditoría, basta con **agregarle la label
`ft-creator`** y asegurar que tenga Python 3.11+ y Chromium (§2).

## 4. Secrets del repo

Para el **Gate 1** (extracción de normas, punto 5 — aún no implementado):

- `ANTHROPIC_API_KEY` → **Settings → Secrets and variables → Actions → New repository
  secret**. Nunca en el código; se inyecta como env en `extraer-norma.yml`.

`generar-ficha.yml` no necesita secrets.

## 5. Fuentes web (si el runner es offline)

La ficha usa **DM Sans** y **DM Serif Display** (Google Fonts, vía `@import` en
`templates/styles.css`). Con red, Chromium las descarga en el render. Sin red, caen
a los fallbacks (`Arial` / `Georgia`) y el PDF sale levemente distinto. Para fidelidad
offline: descargar los `.woff2`, servirlos localmente y reemplazar el `@import` por
`@font-face` apuntando a los archivos.

---

## Workflows

| Workflow             | Trigger                                   | Qué hace                                                        | Estado            |
|----------------------|-------------------------------------------|----------------------------------------------------------------|-------------------|
| `generar-ficha.yml`  | push/PR a `familias/`, `normas/`, `templates/`, `scripts/` · manual | valida → HTML → PDF; sube PDF/HTML como artifact (Gates 2 y 3) | activo |
| `extraer-norma.yml`  | push de PDF a `normas/pdf/` · manual      | la IA extrae la(s) tabla(s) dimensional(es) → PR (Gate 1)      | activo (requiere `ANTHROPIC_API_KEY`) |

### Gate 1 — extracción de normas

1. Subí el PDF de la norma a `normas/pdf/` (vía GitHub web: *Add file → Upload files*).
2. El workflow `extraer-norma.yml` corre `scripts/extraer_norma.py` en el runner, que llama a la API de Anthropic (modelo `claude-opus-4-8` por defecto) y escribe `normas/<norma>-<edicion>.json` como **borrador**.
3. Se abre un **PR** (rama `gate1/extraer-norma`) con el JSON. Si la norma tiene varias tablas aplicables (Product Grade A/B, gruesa/fina), el cuerpo del PR las lista y vos elegís cuál usar (editando el JSON o comentando).
4. **Merge = tabla validada** como fuente de verdad. Recién entonces se reemplazan los `fuente: null` de la familia por datos trazables.

> El secret **`ANTHROPIC_API_KEY`** es obligatorio para este workflow (§4). Los PDFs de normas no se versionan (`.gitignore`) por peso y copyright.
>
> Para que el workflow pueda **abrir el PR**, habilitá en GitHub: **Settings → Actions → General → Workflow permissions → "Read and write permissions"** y marcá **"Allow GitHub Actions to create and approve pull requests"**.
