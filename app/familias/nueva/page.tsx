import Link from "next/link";
import { DatosGeneralesForm } from "../_components/DatosGeneralesForm";

export default function NuevaFamiliaPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem", background: "white", borderRadius: 8 }}>
      <nav style={{ fontSize: 14, marginBottom: 16 }}><Link href="/familias">← Familias</Link></nav>
      <h1 style={{ marginTop: 0 }}>Nueva familia</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Cargá los datos comerciales. Después, en el editor, vinculás las tablas normativas validadas y los textos.
      </p>
      <DatosGeneralesForm mode="nueva" />
    </main>
  );
}
