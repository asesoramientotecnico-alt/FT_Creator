// Coma decimal en presentación (es-AR). Punto en datos.
export function fmt(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
  }
  return String(v).replace(/(\d)\.(\d)/g, "$1,$2");
}
