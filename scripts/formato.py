"""Helpers de presentación (es-AR).

El JSON guarda números con punto decimal; la ficha los muestra con coma.
"""

from __future__ import annotations

from typing import Optional


def num_es(valor, decimales: Optional[int] = None) -> str:
    """Formatea un valor para la ficha (coma decimal es-AR).

    - Si `valor` es numérico: usa `decimales` fijos si se indica, si no
      recorta los ceros sobrantes. Cambia el punto por coma.
    - Si `valor` es texto (p.ej. '40 TPI', 'M6', '1/4"'): se devuelve tal cual.
    """
    if isinstance(valor, bool):  # bool es subclase de int; no lo tratamos como número
        return str(valor)
    if isinstance(valor, (int, float)):
        # `decimales` puede llegar como None o como jinja2.Undefined (clave ausente
        # en el dict de columna); ambos => recortar ceros.
        if isinstance(decimales, int) and not isinstance(decimales, bool):
            s = f"{valor:.{decimales}f}"
        elif isinstance(valor, float):
            s = f"{valor:.10f}".rstrip("0").rstrip(".")
        else:
            s = str(valor)
        return s.replace(".", ",")
    return str(valor)
