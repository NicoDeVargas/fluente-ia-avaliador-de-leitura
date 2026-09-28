import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SeletorIdioma, Topo } from "@/components/ui";
import { idiomaDe, sufixo, textos } from "@/lib/i18n";
import { TEXTOS } from "@/lib/textos";
import { sql } from "@/lib/db";
import { diferencaMediaAbsoluta, fracaoDentro, pearson } from "@/lib/estatistica";

export const dynamic = "force-dynamic";

interface Linha {
  texto_id: string;
  idioma: "pt" | "en";
  corretas: number;
  contagem_manual: number;
}

export default async function Estudo({ searchParams }: PageProps<"/estudo">) {
  const { lang } = await searchParams;
  const idioma = idiomaDe(lang);
  const t = textos[idioma];
  const e = t.estudo;
  const [linhas, [{ leitores }]] = await Promise.all([
    sql<Linha[]>`
      select texto_id, idioma, corretas, contagem_manual from leituras
      where contagem_manual is not null and lower(trim(apelido)) <> 'teste' order by criada_em`,
    sql<{ leitores: number }[]>`
      select count(distinct lower(trim(apelido)))::int as leitores from leituras
      where contagem_manual is not null and lower(trim(apelido)) <> 'teste'`,
  ]);
  const pares = linhas.map((l) => ({ app: l.corretas, humano: l.contagem_manual }));
  const numero = (x: number, casas: number) => x.toLocaleString(t.locale, { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const dif = diferencaMediaAbsoluta(pares);
  const dentro = fracaoDentro(pares, 3);
  const r = pearson(pares);
  const titulo = (id: string) => TEXTOS.find((x) => x.id === id)?.titulo ?? id;

  const destaques = [
    { valor: String(linhas.length), rotulo: e.leituras },
    { valor: String(leitores), rotulo: e.leitores },
    { valor: dif === null ? "-" : numero(dif, 1), rotulo: e.diferenca },
    { valor: dentro === null ? "-" : `${Math.round(dentro * 100)}%`, rotulo: e.dentro },
    { valor: r === null ? "-" : numero(r, 2), rotulo: e.correlacao },
  ];

  return (
    <div lang={t.lang} className="contents">
      <Topo idioma={idioma}>
        <SeletorIdioma idioma={idioma} caminho="/estudo" />
      </Topo>
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-14">
        <div className="entrar max-w-3xl">
          <h1 className="font-display text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">{e.titulo}</h1>
          <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-suave">{e.intro}</p>
        </div>

        {linhas.length === 0 ? (
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-linha px-6 py-10">
            <p className="text-lg">{e.vazio}</p>
            <Link
              href={`/${sufixo(idioma)}`}
              className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento-texto underline-offset-4 hover:underline"
            >
              {e.voltar}
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-linha py-8 sm:grid-cols-3 lg:grid-cols-5">
              {destaques.map((d) => (
                <div key={d.rotulo} className="flex flex-col-reverse justify-end gap-2">
                  <dt className="text-sm leading-snug text-suave">{d.rotulo}</dt>
                  <dd className="font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{d.valor}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="tabela" className="mt-14">
              <h2 id="tabela" className="font-display text-xl font-semibold tracking-tight">
                {e.tabela}
              </h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-linha bg-superficie">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-linha text-suave">
                    <tr>
                      <th scope="col" className="px-3 py-3 sm:px-4 font-semibold">
                        {e.colunas.texto}
                      </th>
                      <th scope="col" className="px-3 py-3 sm:px-4 font-semibold">
                        {e.colunas.idioma}
                      </th>
                      <th scope="col" className="px-3 py-3 sm:px-4 text-right font-semibold">
                        {e.colunas.app}
                      </th>
                      <th scope="col" className="px-3 py-3 sm:px-4 text-right font-semibold">
                        {e.colunas.humano}
                      </th>
                      <th scope="col" className="px-3 py-3 sm:px-4 text-right font-semibold">
                        {e.colunas.dif}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {linhas.map((l, i) => {
                      const d = l.corretas - l.contagem_manual;
                      return (
                        <tr key={i} className="even:bg-fundo/60">
                          <td className="px-3 py-2.5 sm:px-4">{titulo(l.texto_id)}</td>
                          <td className="px-3 py-2.5 sm:px-4 uppercase text-suave">{l.idioma}</td>
                          <td className="px-3 py-2.5 sm:px-4 text-right">{l.corretas}</td>
                          <td className="px-3 py-2.5 sm:px-4 text-right">{l.contagem_manual}</td>
                          <td className={`px-3 py-2.5 sm:px-4 text-right font-semibold ${Math.abs(d) > 3 ? "text-erro" : ""}`}>{d > 0 ? `+${d}` : d}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="metodo">
            <h2 id="metodo" className="font-display text-xl font-semibold tracking-tight">
              {e.metodo}
            </h2>
            <div className="mt-4 flex max-w-[62ch] flex-col gap-4 leading-relaxed">
              {e.metodoTexto.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
          <section aria-labelledby="limites">
            <h2 id="limites" className="font-display text-xl font-semibold tracking-tight">
              {e.limites}
            </h2>
            <ul className="mt-4 flex max-w-[62ch] list-disc flex-col gap-3 pl-5 leading-relaxed marker:text-suave">
              {e.limitesTexto.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
