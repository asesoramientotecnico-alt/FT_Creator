import { notFound } from "next/navigation";
import { Ficha } from "@/components/ficha/Ficha";
import { loadFichaBySlug } from "@/lib/ficha-loader";

export const dynamic = "force-dynamic";

export default async function FichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { slug } = await params;
  const { print } = await searchParams;
  const data = await loadFichaBySlug(slug);
  if (!data) notFound();

  const borrador = data.familia.estado !== "validada";

  if (print === "1") {
    return (
      <>
        <style>{`body { background: white !important; padding: 0 !important; } .ficha { box-shadow: none !important; margin: 0 !important; }`}</style>
        <Ficha data={data} borrador={borrador} />
      </>
    );
  }

  return <Ficha data={data} borrador={borrador} />;
}
