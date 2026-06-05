"""Renderiza un HTML de ficha (o catálogo) a PDF con Playwright/Chromium.

Uso:
    python scripts/render_pdf.py output/borrador/allen-cabeza-cilindrica.html
    python scripts/render_pdf.py output/borrador/allen-cabeza-cilindrica.html output/borrador/allen.pdf
    python scripts/render_pdf.py            # todos los output/borrador/*.html

El tamaño de página lo define el CSS (@page size A4; margin 0). Se usa
print_background para conservar fondos azules y chips.
"""

from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
BORRADOR = RAIZ / "output" / "borrador"


def _pares(argv: list[str]) -> list[tuple[Path, Path]]:
    if not argv:
        htmls = sorted(BORRADOR.glob("*.html"))
        return [(h, h.with_suffix(".pdf")) for h in htmls]
    html = Path(argv[0])
    html = html if html.is_absolute() else RAIZ / html
    if len(argv) >= 2:
        pdf = Path(argv[1])
        pdf = pdf if pdf.is_absolute() else RAIZ / pdf
    else:
        pdf = html.with_suffix(".pdf")
    return [(html, pdf)]


def render(html: Path, pdf: Path) -> None:
    pdf.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # networkidle: da tiempo a cargar las fuentes web (DM Sans / Serif).
        page.goto(html.resolve().as_uri(), wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(
            path=str(pdf),
            format="A4",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            prefer_css_page_size=True,
        )
        browser.close()
    print(f"✓ {html.name} -> {pdf.relative_to(RAIZ) if pdf.is_relative_to(RAIZ) else pdf}")


def main(argv: list[str]) -> int:
    pares = _pares(argv)
    if not pares:
        print("No hay HTML para renderizar en output/borrador/.")
        return 1
    for html, pdf in pares:
        if not html.exists():
            print(f"✗ {html}: no existe")
            return 1
        render(html, pdf)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
