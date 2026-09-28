import Link from "next/link";
import { notFound } from "next/navigation";
import { SeletorIdioma, Topo, secundario } from "@/components/ui";
import { Resultado } from "@/components/Resultado";
import { idiomaDe, sufixo, textos } from "@/lib/i18n";
import { TEXTOS } from "@/lib/textos";
import { sql } from "@/lib/db";
import type { Resultado as TResultado } from "@/lib/alinhar";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Linha {
  idioma: "pt" | "en";
  texto_id: string;
  apelido: string;
  ano: number;
  alinhamento: TResultado;
  contagem_manual: number | null;
}

export default async function Leitura({ params, searchParams }: PageProps<"/leitura/[id]">) {
  const [{ id }, { lang }] = await Promise.all([params, searchParams]);
  const idioma = idiomaDe(lang);
  const t = textos[idioma];
  if (!UUID.test(id)) notFound();
  const [linha] = await sql<Linha[]>`select idioma, texto_id, apelido, ano, alinhamento, contagem_manual from leituras where id = ${id}`;
  const texto = linha && TEXTOS.find((x) => x.id === linha.texto_id && x.idioma === linha.idioma);

  return (
    <div lang={t.lang} className="contents">
      <Topo idioma={idioma}>
        <SeletorIdioma idioma={idioma} caminho={`/leitura/${id}`} />
      </Topo>
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {linha && texto ? (
          <Resultado
            idioma={idioma}
            id={id}
            textoId={texto.id}
            titulo={texto.titulo}
            corpo={texto.corpo}
            idiomaTexto={texto.idioma}
            apelido={linha.apelido}
            ano={linha.ano}
            resultado={linha.alinhamento}
            contagemInicial={linha.contagem_manual}
          />
        ) : (
          <div className="flex flex-col items-start gap-5">
            <p className="text-lg">{t.resultado.naoEncontrada}</p>
            <Link href={`/${sufixo(idioma)}`} className={secundario}>
              {t.resultado.outroTexto}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
