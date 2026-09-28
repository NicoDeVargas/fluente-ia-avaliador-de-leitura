import { notFound } from "next/navigation";
import { SeletorIdioma, Topo } from "@/components/ui";
import { Leitura } from "@/components/Leitura";
import { OutroTexto } from "@/components/OutroTexto";
import { idiomaDe, textos } from "@/lib/i18n";
import { TEXTOS } from "@/lib/textos";

export default async function Ler({ params, searchParams }: PageProps<"/ler/[textoId]">) {
  const [{ textoId }, { lang }] = await Promise.all([params, searchParams]);
  const texto = TEXTOS.find((x) => x.id === textoId);
  if (!texto) notFound();
  const idioma = idiomaDe(lang);
  const t = textos[idioma];

  return (
    <div lang={t.lang} className="contents">
      <Topo idioma={idioma}>
        <SeletorIdioma idioma={idioma} caminho={`/ler/${texto.id}`} />
      </Topo>
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
        <div className="mx-auto mb-2 flex w-full max-w-4xl justify-end">
          <OutroTexto idioma={idioma} textoId={texto.id} idiomaTexto={texto.idioma} ano={texto.ano} />
        </div>
        <Leitura key={texto.id} idioma={idioma} textoId={texto.id} titulo={texto.titulo} corpo={texto.corpo} anoTexto={texto.ano} idiomaTexto={texto.idioma} />
      </main>
    </div>
  );
}
