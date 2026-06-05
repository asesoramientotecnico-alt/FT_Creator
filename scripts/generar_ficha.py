"""Genera el HTML de una ficha a partir de su JSON de familia.

    familias/<id>.json  +  templates/ficha.html.j2  ->  output/borrador/<id>.html

Uso:
    python scripts/generar_ficha.py allen-cabeza-cilindrica
    python scripts/generar_ficha.py familias/allen-cabeza-cilindrica.json
    python scripts/generar_ficha.py            # todas las familias/*.json

Valida el JSON contra el schema antes de renderizar. Las `pendientes[]`
y los campos en borrador se informan pero NO frenan la generación del
borrador (decisión del brief).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

sys.path.insert(0, str(Path(__file__).resolve().parent))
from formato import num_es  # noqa: E402
from schema import Ficha  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
TEMPLATES = RAIZ / "templates"
SALIDA = RAIZ / "output" / "borrador"


def _resolver_familias(argv: list[str]) -> list[Path]:
    if not argv:
        return sorted((RAIZ / "familias").glob("*.json"))
    rutas = []
    for a in argv:
        p = Path(a)
        if p.suffix == ".json":
            rutas.append(p if p.is_absolute() else RAIZ / p)
        else:  # se pasó un id
            rutas.append(RAIZ / "familias" / f"{a}.json")
    return rutas


def _entorno_jinja() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=False,
    )
    env.filters["num_es"] = num_es
    return env


def generar(ruta_json: Path, env: Environment, css: str) -> Path:
    datos = json.loads(ruta_json.read_text(encoding="utf-8"))
    ficha = Ficha.model_validate(datos)  # valida; lanza si el schema falla

    if ficha.pendientes:
        print(f"  · {len(ficha.pendientes)} pendiente(s) para el gate humano "
              f"(no frenan el borrador)")

    # SVG embebido (se inyecta en el HTML para que el PDF lo renderice).
    svg_path = TEMPLATES / ficha.svg.archivo
    svg = svg_path.read_text(encoding="utf-8") if svg_path.exists() else \
        f"<!-- SVG no encontrado: {ficha.svg.archivo} -->"

    template = env.get_template("ficha.html.j2")
    html = template.render(
        ficha=datos,                       # dict crudo: ya validado arriba
        svg=svg,
        css=css,
        pagina=ficha.subcategoria.num,
    )

    SALIDA.mkdir(parents=True, exist_ok=True)
    destino = SALIDA / f"{ficha.id}.html"
    destino.write_text(html, encoding="utf-8")
    print(f"✓ {ruta_json.name} -> {destino.relative_to(RAIZ)}")
    return destino


def main(argv: list[str]) -> int:
    rutas = _resolver_familias(argv)
    if not rutas:
        print("No hay familias para generar.")
        return 1

    env = _entorno_jinja()
    css = (TEMPLATES / "styles.css").read_text(encoding="utf-8")

    err = 0
    for r in rutas:
        if not r.exists():
            print(f"✗ {r}: no existe")
            err = 1
            continue
        try:
            generar(r, env, css)
        except Exception as e:  # noqa: BLE001
            print(f"✗ {r}: {type(e).__name__}: {e}")
            err = 1
    return err


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
