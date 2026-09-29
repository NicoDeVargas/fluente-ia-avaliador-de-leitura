import { CheckCircle, MinusCircle, XCircle } from "@phosphor-icons/react";
import type { Resultado } from "@/lib/alinhar";
import { detectar, gabaritoDoRoteiro, palavrasDoTexto, ultimoAlcancado, type Instrucao } from "@/lib/roteiro";
import { textos, type Idioma } from "@/lib/i18n";

interface Props {
  idioma: Idioma;
  idiomaTexto: "pt" | "en";
  corpo: string;
  roteiro: Instrucao[];
  resultado: Resultado;
}

const limpo = (s: string) => s.replace(/[^\p{L}\p{N}\s'-]/gu, "");

export function PainelRoteiro({ idioma, idiomaTexto, corpo, roteiro, resultado }: Props) {
  const r = textos[idioma].resultado.roteiro;
  const palavras = palavrasDoTexto(corpo);
  const gabarito = gabaritoDoRoteiro(roteiro, corpo, ultimoAlcancado(resultado));
  const deteccoes = roteiro.map((i) => detectar(i, resultado));
  const alcancadas = deteccoes.filter((d) => d !== "nao_alcancada");
  const detectadas = deteccoes.filter((d) => d === "detectada").length;

  return (
    <section aria-labelledby="roteiro-vs-app" className="rounded-2xl border border-linha bg-superficie p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="roteiro-vs-app" className="font-display text-2xl font-semibold tracking-tight">
          {r.titulo}
        </h2>
        <p className="font-display text-2xl font-semibold tabular-nums">
          {detectadas}/{alcancadas.length}
        </p>
      </div>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-suave">{r.ajuda}</p>

      <ul className="mt-5 flex flex-col divide-y divide-linha border-y border-linha">
        {roteiro.map((instrucao, k) => {
          const d = deteccoes[k];
          const Icone = d === "detectada" ? CheckCircle : d === "nao_detectada" ? XCircle : MinusCircle;
          const cor = d === "detectada" ? "text-ok" : d === "nao_detectada" ? "text-erro" : "text-suave";
          const alvo = limpo(palavras.slice(instrucao.indice, instrucao.fim + 1).join(" "));
          return (
            <li key={k} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 py-3">
              <Icone size={24} weight="fill" className={`${cor} mt-0.5`} aria-hidden />
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold">
                  {r.tipos[instrucao.tipo]}: <span lang={idiomaTexto}>“{alvo}”</span>
                  {instrucao.dizer && (
                    <span lang={idiomaTexto} className="font-normal text-suave">
                      {" "}
                      → {instrucao.tipo === "autocorrecao" ? `${instrucao.dizer}… ${alvo}` : instrucao.dizer}
                    </span>
                  )}
                </p>
                <p className="text-sm text-suave">
                  {r.esperadoRotulo}: {r.esperado[instrucao.tipo]}
                  <span aria-hidden> · </span>
                  <span className={`font-semibold ${cor}`}>{r.deteccao[d]}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <table className="mt-5 w-full max-w-md text-left text-sm tabular-nums">
        <thead className="text-suave">
          <tr>
            <th scope="col" className="py-1.5 pr-3 font-semibold">
              <span className="sr-only">{r.titulo}</span>
            </th>
            <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
              {r.corretas}
            </th>
            <th scope="col" className="py-1.5 text-right font-semibold">
              {r.erros}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-linha">
            <th scope="row" className="py-2 pr-3 font-semibold">
              {r.gabarito}
            </th>
            <td className="py-2 pr-3 text-right text-lg font-semibold">{gabarito.corretas}</td>
            <td className="py-2 text-right text-lg font-semibold">{gabarito.erros}</td>
          </tr>
          <tr className="border-t border-linha">
            <th scope="row" className="py-2 pr-3 font-semibold">
              {r.app}
            </th>
            <td className={`py-2 pr-3 text-right text-lg font-semibold ${resultado.corretas !== gabarito.corretas ? "text-erro" : ""}`}>{resultado.corretas}</td>
            <td className={`py-2 text-right text-lg font-semibold ${resultado.erros !== gabarito.erros ? "text-erro" : ""}`}>{resultado.erros}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
