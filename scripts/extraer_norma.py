"""Gate 1 — extrae la(s) tabla(s) dimensional(es) de un PDF de norma a JSON.

    normas/pdf/<archivo>.pdf  ->  normas/<norma>-<edicion>.json  (borrador)

Uso:
    python scripts/extraer_norma.py normas/pdf/iso-4762-2004.pdf
    python scripts/extraer_norma.py normas/pdf/iso-4762-2004.pdf --salida normas/iso-4762-2004.json

Requiere:
    - ANTHROPIC_API_KEY en el entorno (secret del repo en CI; nunca en el código).
    - El paquete `anthropic` (ver requirements.txt).

Comportamiento (decisiones del BRIEF):
    - NO inventa valores: si la norma no define una celda, queda en null.
    - Conserva tolerancias (máx/mín) cuando la tabla las da.
    - Si hay varias tablas aplicables (Product Grade A/B, serie gruesa/fina,
      pulgadas/métrico), devuelve TODAS y agrega una `pendiente` para que el
      humano elija en el PR (Gate 1).
    - Marca todo como origen="ia", estado="borrador". El merge del PR valida.

La salida es SIEMPRE un borrador para revisión humana en el PR; nunca se
publica automáticamente como fuente de verdad.
"""

from __future__ import annotations

import argparse
import base64
import datetime as _dt
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from schema import (  # noqa: E402
    NormaDoc,
    NormaExtraccion,
    NormaExtraido,
    Pendiente,
)

RAIZ = Path(__file__).resolve().parent.parent
MODELO_DEFECTO = "claude-opus-4-8"

SYSTEM = (
    "Sos un asistente técnico que extrae tablas dimensionales de normas de "
    "bulonería (ISO, DIN, ASME, etc.) desde el PDF de la norma. Trabajás en "
    "castellano. Reglas estrictas:\n"
    "- NO inventes valores. Si la norma no define una celda, dejá nom/max/min/texto en null.\n"
    "- Conservá tolerancias: cuando la tabla da máximo y mínimo, completá `max` y `min`; "
    "`nom` es el nominal.\n"
    "- Valores numéricos con punto decimal. Si un valor no es numérico (ej '40 TPI', "
    "'M6 × 1'), ponelo en `texto` y dejá nom/max/min en null.\n"
    "- Si la norma ofrece MÁS DE UNA tabla aplicable (Product Grade A vs B, serie "
    "gruesa vs fina, métrico vs pulgadas), devolvé CADA UNA como una tabla separada y "
    "describí en `aplicable` a qué corresponde. No las mezcles.\n"
    "- `resumen_tablas`: markdown breve que liste las tablas extraídas (id, título, "
    "a qué aplican, nº de filas) para que un humano elija cuál usar."
)

# Esquema de salida estructurada (json_schema). Sin claves dinámicas:
# las celdas se listan con columna_id explícito.
SCHEMA_SALIDA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "norma": {"type": "string"},
        "edicion": {"type": ["string", "null"]},
        "resumen_tablas": {"type": "string"},
        "tablas": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "id": {"type": "string"},
                    "titulo": {"type": "string"},
                    "aplicable": {"type": "string"},
                    "unidad": {"type": "string"},
                    "columnas": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "id": {"type": "string"},
                                "label": {"type": "string"},
                                "descripcion": {"type": "string"},
                            },
                            "required": ["id", "label", "descripcion"],
                        },
                    },
                    "filas": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "designacion": {"type": "string"},
                                "celdas": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {
                                            "columna_id": {"type": "string"},
                                            "nom": {"type": ["number", "null"]},
                                            "max": {"type": ["number", "null"]},
                                            "min": {"type": ["number", "null"]},
                                            "texto": {"type": ["string", "null"]},
                                        },
                                        "required": ["columna_id", "nom", "max", "min", "texto"],
                                    },
                                },
                            },
                            "required": ["designacion", "celdas"],
                        },
                    },
                },
                "required": ["id", "titulo", "aplicable", "unidad", "columnas", "filas"],
            },
        },
    },
    "required": ["norma", "edicion", "resumen_tablas", "tablas"],
}


def _slug(norma: str, edicion: str | None) -> str:
    base = f"{norma}-{edicion}" if edicion else norma
    base = base.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base


def extraer(pdf: Path, modelo: str) -> NormaExtraccion:
    """Llama a la API de Anthropic con el PDF y devuelve la extracción validada."""
    import anthropic  # import perezoso: el script puede importarse sin la lib

    datos_pdf = base64.standard_b64encode(pdf.read_bytes()).decode("utf-8")
    client = anthropic.Anthropic()  # resuelve ANTHROPIC_API_KEY del entorno

    # Streaming para no exceder el timeout HTTP en tablas grandes.
    with client.messages.stream(
        model=modelo,
        max_tokens=32000,
        system=SYSTEM,
        output_config={"format": {"type": "json_schema", "schema": SCHEMA_SALIDA}},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": datos_pdf,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extraé la(s) tabla(s) dimensional(es) de esta norma de "
                            "bulonería siguiendo las reglas. Devolvé el JSON pedido."
                        ),
                    },
                ],
            }
        ],
    ) as stream:
        msg = stream.get_final_message()

    texto = next((b.text for b in msg.content if b.type == "text"), None)
    if not texto:
        raise RuntimeError("La respuesta no contiene JSON de texto.")
    return NormaExtraccion.model_validate_json(texto)


def construir_doc(ext: NormaExtraccion, pdf: Path, modelo: str) -> NormaDoc:
    pendientes: list[Pendiente] = []
    if len(ext.tablas) > 1:
        opciones = " · ".join(f"{t.id} ({t.aplicable})" for t in ext.tablas)
        pendientes.append(
            Pendiente(
                tipo="seleccion_tabla",
                campo="tablas",
                pregunta=(
                    f"La norma ofrece {len(ext.tablas)} tablas aplicables: {opciones}. "
                    "Elegí cuál(es) usar (eliminá las que no correspondan o indicalo en el PR)."
                ),
            )
        )
    pendientes.append(
        Pendiente(
            tipo="validacion",
            campo="tablas",
            pregunta="Verificá los valores extraídos contra el PDF antes de mergear (Gate 1).",
        )
    )

    return NormaDoc(
        norma=ext.norma,
        edicion=ext.edicion,
        extraido=NormaExtraido(
            modelo=modelo,
            fecha=_dt.date.today().isoformat(),
            pdf=str(pdf.relative_to(RAIZ)) if pdf.is_relative_to(RAIZ) else str(pdf),
        ),
        pendientes=pendientes,
        resumen_tablas=ext.resumen_tablas,
        tablas=ext.tablas,
    )


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Extrae tabla(s) normativa(s) de un PDF a JSON (Gate 1).")
    ap.add_argument("pdf", help="Ruta al PDF de la norma (normas/pdf/*.pdf)")
    ap.add_argument("--salida", help="Ruta del JSON de salida (por defecto normas/<norma>-<edicion>.json)")
    ap.add_argument("--modelo", default=MODELO_DEFECTO, help=f"Modelo de Anthropic (def: {MODELO_DEFECTO})")
    ap.add_argument("--resumen-md", help="Escribe el resumen de tablas en este .md (cuerpo del PR)")
    args = ap.parse_args(argv)

    pdf = Path(args.pdf)
    pdf = pdf if pdf.is_absolute() else RAIZ / pdf
    if not pdf.exists():
        print(f"✗ No existe el PDF: {pdf}")
        return 1

    print(f"Extrayendo {pdf.name} con {args.modelo} …")
    ext = extraer(pdf, args.modelo)
    doc = construir_doc(ext, pdf, args.modelo)

    salida = Path(args.salida) if args.salida else RAIZ / "normas" / f"{_slug(doc.norma, doc.edicion)}.json"
    salida = salida if salida.is_absolute() else RAIZ / salida
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(
        json.dumps(doc.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"✓ {salida.relative_to(RAIZ)} ({len(doc.tablas)} tabla/s, estado=borrador)")
    for t in doc.tablas:
        print(f"  · {t.id}: {t.titulo} — {t.aplicable} ({len(t.filas)} filas)")

    if args.resumen_md:
        rm = Path(args.resumen_md)
        rm = rm if rm.is_absolute() else RAIZ / rm
        cuerpo = (
            f"## Gate 1 — extracción de **{doc.norma}"
            + (f" ({doc.edicion})" if doc.edicion else "")
            + "**\n\n"
            f"Borrador generado por IA (`{args.modelo}`) desde `{doc.extraido.pdf}`. "
            "**Revisar antes de mergear** — el merge valida la tabla como fuente de verdad.\n\n"
            f"{doc.resumen_tablas}\n\n"
            "### Pendientes\n"
            + "".join(f"- ({p.tipo}) {p.pregunta}\n" for p in doc.pendientes)
        )
        rm.write_text(cuerpo, encoding="utf-8")
        print(f"✓ resumen para PR -> {rm.relative_to(RAIZ)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
