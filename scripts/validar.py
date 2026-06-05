"""Validación de fichas: schema + estado + reporte de pendientes.

Uso:
    python scripts/validar.py familias/allen-cabeza-cilindrica.json
    python scripts/validar.py                # valida todas las familias/*.json

Código de salida:
    0  schema válido (puede haber pendientes/borradores: se informan, no frenan)
    1  error de schema en al menos un archivo
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pydantic import ValidationError

# permite ejecutar como script suelto (python scripts/validar.py)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from schema import Ficha, NormaDoc  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent


def _campos_en_borrador(ficha: Ficha) -> list[str]:
    """Lista de campos generados que siguen en estado borrador."""
    pend = []
    if ficha.estado.value in ("borrador",):
        pend.append("ficha.estado = borrador")
    if ficha.materiales.estado.value == "borrador":
        pend.append("materiales (borrador)")
    if ficha.descripcion.estado.value == "borrador":
        pend.append("descripcion (borrador)")
    if ficha.svg.estado.value == "borrador":
        pend.append(f"svg {ficha.svg.archivo} (borrador)")
    for i, s in enumerate(ficha.series):
        if s.fuente is None:
            pend.append(f"series[{i}] '{s.titulo}': sin fuente validada (Gate 1 pendiente)")
        for fila in s.filas:
            if fila.estado.value != "ok":
                pend.append(f"series[{i}] fila {fila.d}: {fila.estado.value}"
                            + (f" — {fila.nota}" if fila.nota else ""))
    return pend


def validar_norma(ruta: Path) -> bool:
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    try:
        doc = NormaDoc.model_validate(datos)
    except ValidationError as e:
        print(f"✗ {ruta}: schema de NORMA INVÁLIDO")
        print(e)
        return False

    print(f"✓ {ruta}: norma válida ({doc.norma}"
          + (f" {doc.edicion}" if doc.edicion else "")
          + f", {len(doc.tablas)} tabla/s, estado={doc.estado.value})")
    for t in doc.tablas:
        print(f"    · {t.id}: {t.titulo} — {t.aplicable} ({len(t.filas)} filas)")
    if doc.pendientes:
        print(f"  Pendientes para el gate humano ({len(doc.pendientes)}):")
        for p in doc.pendientes:
            print(f"    · ({p.tipo}) {p.pregunta}")
    if doc.estado.value == "borrador":
        print("  · estado = borrador (no usar como fuente hasta validar/mergear)")
    return True


def validar_archivo(ruta: Path) -> bool:
    # Las normas viven en normas/ y usan otro schema.
    try:
        rel = ruta.resolve().relative_to(RAIZ)
        es_norma = rel.parts[0] == "normas"
    except ValueError:
        es_norma = False
    if es_norma:
        return validar_norma(ruta)

    datos = json.loads(ruta.read_text(encoding="utf-8"))
    try:
        ficha = Ficha.model_validate(datos)
    except ValidationError as e:
        print(f"✗ {ruta}: schema INVÁLIDO")
        print(e)
        return False

    print(f"✓ {ruta}: schema válido (id={ficha.id}, estado={ficha.estado.value})")

    if ficha.pendientes:
        print(f"  Pendientes para el gate humano ({len(ficha.pendientes)}):")
        for p in ficha.pendientes:
            campo = f" [{p.campo}]" if p.campo else ""
            print(f"    · ({p.tipo}){campo} {p.pregunta}")

    borradores = _campos_en_borrador(ficha)
    if borradores:
        print(f"  Campos en borrador / no publicables ({len(borradores)}):")
        for b in borradores:
            print(f"    · {b}")

    return True


def main(argv: list[str]) -> int:
    if argv:
        rutas = [Path(a) for a in argv]
    else:
        rutas = sorted((RAIZ / "familias").glob("*.json")) + sorted((RAIZ / "normas").glob("*.json"))
        if not rutas:
            print("No hay familias/*.json ni normas/*.json para validar.")
            return 0

    ok = True
    for r in rutas:
        if not r.exists():
            print(f"✗ {r}: no existe")
            ok = False
            continue
        ok = validar_archivo(r) and ok
        print()

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
