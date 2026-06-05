"""Ensambla N fichas en un catálogo HTML (portada + índice + fichas).

STUB del milestone 1: concatena los fragmentos de ficha de las familias
VALIDADAS dentro de templates/catalogo.html.j2. Portada e índice
definitivos se diseñan más adelante (no es objetivo de la sesión 1).

Uso:
    python scripts/ensamblar.py            # todas las familias validadas
    python scripts/ensamblar.py --incluir-borradores

Por defecto solo incluye fichas con estado 'validada' (no se publica
nada en borrador). Con --incluir-borradores se arma un catálogo de
preview que NO debe publicarse.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

sys.path.insert(0, str(Path(__file__).resolve().parent))
from formato import num_es  # noqa: E402
from schema import Ficha  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
TEMPLATES = RAIZ / "templates"
SALIDA = RAIZ / "output"

# extrae el <div class="ficha"> ... </div> del HTML individual
_RE_FICHA = re.compile(r'(<div class="ficha".*?</div>\s*</body>)', re.DOTALL)


def _fragmento(html: str) -> str:
    """Devuelve solo el bloque .ficha (sin <html>/<head>/<style>)."""
    inicio = html.find('<div class="ficha"')
    fin = html.rfind("</div>")
    if inicio == -1 or fin == -1:
        return html
    return html[inicio:fin + len("</div>")]


def main(argv: list[str]) -> int:
    incluir_borradores = "--incluir-borradores" in argv

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
    )
    env.filters["num_es"] = num_es
    css = (TEMPLATES / "styles.css").read_text(encoding="utf-8")

    fragmentos, indice = [], []
    for jpath in sorted((RAIZ / "familias").glob("*.json")):
        ficha = Ficha.model_validate(json.loads(jpath.read_text(encoding="utf-8")))
        if ficha.estado.value != "validada" and not incluir_borradores:
            print(f"  · {ficha.id}: estado={ficha.estado.value}, omitida "
                  f"(usar --incluir-borradores para preview)")
            continue
        html_path = SALIDA / "borrador" / f"{ficha.id}.html"
        if not html_path.exists():
            print(f"  · {ficha.id}: falta {html_path.name}, corré generar_ficha.py primero")
            continue
        fragmentos.append(_fragmento(html_path.read_text(encoding="utf-8")))
        indice.append({"num": ficha.subcategoria.num, "nombre": ficha.nombre})

    if not fragmentos:
        print("No hay fichas para ensamblar.")
        return 1

    html = env.get_template("catalogo.html.j2").render(css=css, fichas=fragmentos, indice=indice)
    destino = SALIDA / "borrador" / "catalogo.html"
    destino.write_text(html, encoding="utf-8")
    print(f"✓ catálogo ({len(fragmentos)} ficha/s) -> {destino.relative_to(RAIZ)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
