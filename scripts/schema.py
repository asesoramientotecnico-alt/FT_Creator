"""Schema (pydantic) de la ficha técnica por familia.

Es el contrato central del pipeline (ver BRIEF). Reglas:
  - Todo campo con datos generados lleva `origen` y `estado`.
  - Todo valor dimensional referencia su `fuente` a nivel de serie;
    discrepancias/exclusiones se marcan por fila con `estado` + `nota`.
  - `pendientes[]` acumula preguntas para el gate humano; nunca frena.

Notas de diseño:
  - `texto`/`valor` aceptan str o list[str] para soportar render
    multilínea sin embeber HTML en los datos (decisión "no mezclar
    presentación en los JSON").
  - El valor de una celda es un escalar (str|int|float) o un objeto
    con tolerancia {nom, max, min}.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class Origen(str, Enum):
    norma = "norma"
    ia = "ia"
    humano = "humano"


class Estado(str, Enum):
    borrador = "borrador"
    validado = "validado"
    # estados de ciclo de vida de la ficha completa
    validada = "validada"


class EstadoFila(str, Enum):
    ok = "ok"
    faltante = "faltante"
    discrepancia = "discrepancia"


class _Base(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Validacion(_Base):
    revisor: Optional[str] = None
    fecha: Optional[str] = None


class Pendiente(_Base):
    tipo: str  # idioma | seleccion_tabla | discrepancia | ...
    campo: Optional[str] = None
    pregunta: str


class Categoria(_Base):
    num: int
    nombre: str


class Subcategoria(_Base):
    num: str
    nombre: str
    nombre_en: Optional[str] = None


class NormaAplicable(_Base):
    codigo: str
    edicion: Optional[str] = None
    rol: str  # dimensional | material
    sistema: str  # metrico | pulgadas


class Campo(_Base):
    """Campo de texto trazable (materiales, descripción)."""
    texto: Union[str, list[str]]
    origen: Origen
    estado: Estado = Estado.borrador


class InfoItem(_Base):
    label: str
    valor: Union[str, list[str]]
    origen: Origen
    # `fuente` es null mientras no exista la norma validada (Gate 1)
    fuente: Optional[str] = None


class SvgRef(_Base):
    archivo: str
    origen: Origen
    estado: Estado = Estado.borrador


class Columna(_Base):
    id: str
    label: str
    sublabel: Optional[str] = None
    con_tolerancia: bool = False
    # nº fijo de decimales al renderizar (es-AR); None = recorta ceros
    decimales: Optional[int] = None


class Tolerancia(_Base):
    nom: Union[int, float]
    max: Optional[Union[int, float]] = None
    min: Optional[Union[int, float]] = None


# valor de celda: escalar o tolerancia
Valor = Union[int, float, str, Tolerancia]


class Fila(_Base):
    d: str  # etiqueta de la primera columna (nominal: "M6", '1/4"', ...)
    valores: dict[str, Valor] = Field(default_factory=dict)
    estado: EstadoFila = EstadoFila.ok
    nota: Optional[str] = None


class Fuente(_Base):
    norma: str
    edicion: Optional[str] = None
    tabla: Optional[str] = None
    archivo: Optional[str] = None


class Serie(_Base):
    sistema: str  # metrico | pulgadas
    titulo: str
    # `fuente` es null hasta que el JSON de norma del Gate 1 exista
    fuente: Optional[Fuente] = None
    tabla_elegida_por: Optional[str] = None
    nota: Optional[str] = None
    columnas: list[Columna]
    filas: list[Fila]


class Ficha(_Base):
    schema_version: str
    id: str
    estado: Estado = Estado.borrador
    validacion: Validacion = Field(default_factory=Validacion)
    pendientes: list[Pendiente] = Field(default_factory=list)
    categoria: Categoria
    subcategoria: Subcategoria
    nombre: str
    normas_aplicables: list[NormaAplicable]
    materiales: Campo
    info: list[InfoItem] = Field(default_factory=list)
    descripcion: Campo
    aplicaciones: list[str] = Field(default_factory=list)
    presentacion: str
    svg: SvgRef
    series: list[Serie]
