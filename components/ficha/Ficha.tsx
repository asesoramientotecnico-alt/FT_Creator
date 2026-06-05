import "./ficha.css";
import { fmt } from "./format";
import type { CeldaTol, ColumnaTabla, FichaData, FilaTabla } from "@/lib/types";

function isTol(v: unknown): v is CeldaTol {
  return typeof v === "object" && v !== null && "nom" in (v as object);
}

function Celda({ col, val }: { col: ColumnaTabla; val: unknown }) {
  if (val === undefined || val === null || val === "") {
    return <td className="faltante">—</td>;
  }
  if (isTol(val)) {
    return (
      <td className="cota-tol">
        <span className="nom">{fmt(val.nom as any)}</span>
        {(val.max != null || val.min != null) && (
          <span className="mm">
            {val.max != null ? `máx ${fmt(val.max as any)}` : ""}
            {val.max != null && val.min != null ? " · " : ""}
            {val.min != null ? `mín ${fmt(val.min as any)}` : ""}
          </span>
        )}
      </td>
    );
  }
  return <td>{fmt(val as any)}</td>;
}

export function Ficha({ data, borrador = false }: { data: FichaData; borrador?: boolean }) {
  const { familia, series, normas_aplicables } = data;

  // Tomamos las columnas de la primera serie como referencia.
  // (M1: ambas series del prototipo tienen el mismo set de columnas.)
  const columnas: ColumnaTabla[] = series[0]?.tabla.columnas ?? [];

  return (
    <div className={`ficha ${borrador ? "ficha--borrador" : ""}`} id={familia.slug}>
      <div className="ficha__header">
        <div className="ficha__header-cat">
          {familia.categoria_num} — {familia.categoria_nombre}
        </div>
        <div className="ficha__header-sub">
          {familia.subcategoria_num} {familia.subcategoria_nombre}
          {familia.nombre_en && <small>{familia.nombre_en}</small>}
        </div>
      </div>

      <div className="ficha__body">
        <div className="ficha__plano">
          <div className="ficha__plano-label">Vista de perfil — plano técnico</div>
          {familia.svg_path && (
            // SVG inline desde /public para que viaje dentro del PDF sin requests extra.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={familia.svg_path} alt="" />
          )}
        </div>

        <div className="ficha__info">
          {familia.nombre_en && (
            <>
              <div className="ficha__nombre-en">{familia.nombre_en}</div>
              <div className="ficha__divider" />
            </>
          )}

          {normas_aplicables.length > 0 && (
            <div className="ficha__info-grupo">
              <div className="ficha__info-label">Normas aplicables</div>
              <div className="ficha__info-val">
                {normas_aplicables.map((n) => (
                  <span key={n.id} className="norma">{n.codigo}</span>
                ))}
              </div>
            </div>
          )}

          {familia.materiales && (
            <div className="ficha__info-grupo">
              <div className="ficha__info-label">Materiales disponibles</div>
              <div className="ficha__info-val" style={{ whiteSpace: "pre-line" }}>
                {familia.materiales}
              </div>
            </div>
          )}

          {familia.rango_comercial && (
            <div className="ficha__info-grupo">
              <div className="ficha__info-label">Rosca</div>
              <div className="ficha__info-val" style={{ whiteSpace: "pre-line" }}>
                {familia.rango_comercial}
              </div>
            </div>
          )}

          {familia.descripcion && (
            <div className="ficha__info-grupo">
              <div className="ficha__info-label">Descripción</div>
              <div className="ficha__desc">{familia.descripcion}</div>
            </div>
          )}

          {familia.aplicaciones.length > 0 && (
            <div className="ficha__info-grupo">
              <div className="ficha__info-label">Aplicaciones típicas</div>
              <div className="ficha__apps">
                {familia.aplicaciones.map((a) => (
                  <span key={a} className="ficha__app-tag">{a}</span>
                ))}
              </div>
            </div>
          )}

          {familia.presentacion && (
            <div className="ficha__info-grupo ficha__info-presentacion">
              <div className="ficha__info-label">Presentación</div>
              <div className="ficha__info-val">{familia.presentacion}</div>
            </div>
          )}
        </div>
      </div>

      <div className="ficha__tabla-wrap">
        <div className="ficha__tabla-titulo">Tabla de cotas y dimensiones</div>
        <table className="cotas">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.id}>
                  {c.label}
                  {c.sub && <span className="sub">{c.sub}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((s) => {
              const filas = s.tabla.filas as FilaTabla[];
              return (
                <>
                  <tr key={`sep-${s.id}`} className="serie-sep">
                    <td colSpan={Math.max(1, columnas.length - 3)}>
                      {`Serie ${s.sistema === "metrico" ? "Métrica" : "Whitworth BSW"} — ${s.norma.codigo}`}
                    </td>
                    {s.nota && (
                      <td className="serie-nota" colSpan={3}>
                        {s.nota}
                      </td>
                    )}
                  </tr>
                  {filas.map((fila, i) => (
                    <tr key={`${s.id}-${i}`}>
                      {columnas.map((c) => (
                        <Celda key={c.id} col={c} val={fila[c.id]} />
                      ))}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ficha__pie">
        <span className="ficha__pie-nota">
          Datos orientativos. Confirmar disponibilidad y tolerancias con equipo técnico · famiq.com.ar
        </span>
        <span className="ficha__pie-pag">{familia.subcategoria_num}</span>
      </div>
    </div>
  );
}
