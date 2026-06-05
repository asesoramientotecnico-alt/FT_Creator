# FT_Creator — Pipeline de fichas técnicas (Bulonería FAMIQ)

Genera fichas técnicas de bulonería en acero inoxidable, **una ficha por familia**,
con salida HTML → PDF. Cada valor dimensional es trazable a su fuente (norma +
edición + tabla). Nada se inventa: los faltantes y discrepancias se marcan.

El documento de diseño es **BRIEF-pipeline-fichas.md** (decisiones cerradas).
La operación del runner está en **SETUP.md**.

## Estructura

```
familias/        JSON de ficha por familia (el contrato; ver scripts/schema.py)
normas/          tablas normativas validadas (JSON) · normas/pdf/ los PDF fuente
templates/       ficha.html.j2, catalogo.html.j2, styles.css, svg/
scripts/         schema.py, validar.py, generar_ficha.py, render_pdf.py, ensamblar.py
output/          borrador/ (pre-validación) · final/ (PDFs aprobados)
referencia/      prototipo visual original (solo lectura)
.github/workflows/  generar-ficha.yml · extraer-norma.yml
```

## Uso (en el runner — ver SETUP.md)

```bash
python3 scripts/validar.py                                  # schema + pendientes
python3 scripts/generar_ficha.py allen-cabeza-cilindrica    # JSON -> HTML
python3 scripts/render_pdf.py                               # HTML -> PDF
# salida: output/borrador/allen-cabeza-cilindrica.pdf
```

## Estado del milestone (sesión 1)

- [x] Esqueleto de repo + schema (pydantic) + validador
- [x] Template Jinja2 derivado de la referencia (sin contenteditable / botones / localStorage / emojis)
- [x] `familias/allen-cabeza-cilindrica.json` cargado a mano (datos del prototipo; `origen: humano`, `estado: borrador`, `fuente: null`)
- [x] Pipeline `generar_ficha.py` + `render_pdf.py` → PDF de la ficha 1.1
- [x] `generar-ficha.yml` (artifact del PDF) · `extraer-norma.yml` (stub)
- [x] Gate 3 (densidad): ficha 1.1 entra en **una** página A4 (compactación en `styles.css`)
- [ ] Runner self-hosted registrado (ver SETUP.md)
- [ ] Punto 5: `extraer_norma.py` + Gate 1 (fuera de alcance de esta sesión)
