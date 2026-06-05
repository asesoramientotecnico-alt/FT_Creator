export type Sistema = "metrico" | "pulgadas";
export type Estado = "borrador" | "validada";

export type ColumnaTabla = {
  id: string;
  label: string;
  sub?: string;
  con_tolerancia?: boolean;
};

export type CeldaTol = { nom: number | string | null; max?: number | string | null; min?: number | string | null };
export type Celda = number | string | null | CeldaTol;
export type FilaTabla = Record<string, Celda>;

export type TablaNormativa = {
  id: string;
  norma_id: string;
  nombre: string;
  descripcion: string | null;
  columnas: ColumnaTabla[];
  filas: FilaTabla[];
  estado: Estado;
};

export type Norma = {
  id: string;
  codigo: string;
  edicion: string;
};

export type Familia = {
  id: string;
  slug: string;
  categoria_num: number | null;
  categoria_nombre: string | null;
  subcategoria_num: string | null;
  subcategoria_nombre: string | null;
  nombre_en: string | null;
  materiales: string | null;
  rango_comercial: string | null;
  presentacion: string | null;
  descripcion: string | null;
  aplicaciones: string[];
  svg_path: string | null;
  estado: Estado;
};

export type Serie = {
  id: string;
  sistema: Sistema;
  nota: string | null;
  orden: number;
  tabla: TablaNormativa;
  norma: Norma;
};

export type FichaData = {
  familia: Familia;
  series: Serie[];
  normas_aplicables: Norma[];
};
