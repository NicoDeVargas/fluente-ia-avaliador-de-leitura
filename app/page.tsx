import Link from "next/link";
import { ArrowRight, ChartBar, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { SeletorIdioma, Topo } from "@/components/ui";
import { EscolhaTexto } from "@/components/EscolhaTexto";
import { idiomaDe, sufixo, textos } from "@/lib/i18n";
import { ESTILO } from "@/lib/marcas";

export default async function Inicio({ searchParams }: PageProps<"/">) {
  const { lang } = await searchParams;
  const idioma = idiomaDe(lang);
  const t = textos[idioma];
  const ex = t.inicio.exemplo;

  return (
    <div lang={t.lang} className="contents">
      <Topo idioma={idioma}>
        <Link
          href={`/estudo${sufixo(idioma)}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-suave hover:text-tinta"
        >
          <ChartBar size={18} weight="bold" aria-hidden />
          <span className="hidden sm:inline">{t.topo.estudo}</span>
          <span className="sr-only sm:hidden">{t.topo.estudo}</span>
        </Link>
        <SeletorIdioma idioma={idioma} caminho="/" />
      </Topo>
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-x-16 lg:gap-y-12">
        <section className="entrar lg:col-start-1 lg:row-start-1">
          <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">{t.inicio.titulo}</h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-suave">{t.inicio.problema}</p>
          <figure className="mt-8 max-w-md">
            <div className="folha rounded-2xl border border-linha px-5 py-4 sm:px-6">
              <p className="text-xl leading-[2.3]" aria-hidden>
                {ex.antes}{" "}
                <ruby>
                  <span className={ESTILO.trocada}>{ex.trocada}</span>
                  <rt className="font-semibold text-erro">{ex.dito}</rt>
                </ruby>{" "}
                {ex.meio && `${ex.meio} `}
                <span className={ESTILO.pulada}>{ex.pulada}</span>.
              </p>
            </div>
            <figcaption className="mt-2.5 text-sm leading-relaxed text-suave">{ex.legenda}</figcaption>
          </figure>
        </section>
        <div className="entrar lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <EscolhaTexto idioma={idioma} />
        </div>
        <section aria-labelledby="como" className="lg:col-start-1 lg:row-start-2">
          <h2 id="como" className="font-display text-xl font-semibold tracking-tight">
            {t.inicio.comoFunciona}
          </h2>
          <ol className="mt-4 flex flex-col gap-4">
            {t.inicio.passos.map((passo, i) => (
              <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 leading-relaxed">
                <span
                  className="flex size-8 items-center justify-center rounded-full border border-linha font-display text-sm font-semibold tabular-nums text-suave"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{passo}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex gap-2.5 border-t border-linha pt-5 text-sm leading-relaxed text-suave">
            <LockSimple size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
            {t.inicio.privacidade}
          </p>
          <Link
            href={`/estudo${sufixo(idioma)}`}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento-texto underline-offset-4 hover:underline"
          >
            {t.inicio.estudo}
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
        </section>
      </main>
    </div>
  );
}
