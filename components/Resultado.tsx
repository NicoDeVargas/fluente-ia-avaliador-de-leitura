"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle,
  FlagPennant,
  Hourglass,
  Pause,
  Play,
  Plus,
  SpeakerSlash,
} from "@phosphor-icons/react";
import type { Extra, ItemTexto, Marca, Resultado as TResultado } from "@/lib/alinhar";
import { segmentar } from "@/lib/segmentos";
import { ESTILO, ESTILO_SILABADA } from "@/lib/marcas";
import { NIVEIS, classificar } from "@/lib/classificacao";
import { REFERENCIA_PCPM } from "@/lib/referencias";
import { sufixo, textos, type Idioma } from "@/lib/i18n";
import { campo, primario, secundario } from "@/components/ui";
import { PainelRoteiro } from "@/components/PainelRoteiro";
import type { Instrucao } from "@/lib/roteiro";

interface Props {
  idioma: Idioma;
  id: string;
  textoId: string;
  titulo: string;
  corpo: string;
  idiomaTexto: "pt" | "en";
  apelido: string;
  ano: number;
  resultado: TResultado;
  contagemInicial: number | null;
  audioUrl?: string;
  onLerDeNovo?: () => void;
  roteiro?: Instrucao[] | null;
}

const limpo = (s: string) => s.replace(/[^\p{L}\p{N}\s'-]/gu, "");
const silabada = (i: ItemTexto) => !!i.silabada && (i.marca === "correta" || i.marca === "autocorrecao");

function Amostra({ tipo }: { tipo: Marca | "hesitacao" | "repeticao" | "insercao" | "silabada" }) {
  if (tipo === "hesitacao") return <Hesitacao />;
  if (tipo === "silabada") return <span className={`font-semibold ${ESTILO_SILABADA}`}>Aa</span>;
  if (tipo === "repeticao" || tipo === "insercao") return <Chip tipo={tipo} texto="aa" />;
  return <span className={`font-semibold ${ESTILO[tipo]}`}>Aa</span>;
}

function Hesitacao() {
  return (
    <span className="mr-1 inline-flex size-[1.1em] translate-y-[0.12em] items-center justify-center rounded-full bg-pausa-suave text-pausa" aria-hidden>
      <Hourglass size="0.7em" weight="bold" />
    </span>
  );
}

function Chip({ tipo, texto, rotulo }: { tipo: Extra["tipo"]; texto: string; rotulo?: string }) {
  const Icone = tipo === "repeticao" ? ArrowClockwise : Plus;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-suave/60 px-1 align-[0.15em] text-[0.62em] leading-[1.5] text-suave">
      <Icone size="0.9em" weight="bold" aria-hidden />
      {rotulo && <span className="sr-only">{rotulo}: </span>}
      {texto}
    </span>
  );
}

function Escala({ pcpm, referencia, rotuloRef }: { pcpm: number; referencia: number; rotuloRef: string }) {
  const maximo = Math.max(referencia * 1.4, pcpm * 1.1, 20);
  const pos = (v: number) => `${Math.min(100, (v / maximo) * 100)}%`;
  return (
    <div className="relative mt-8 h-14" aria-hidden>
      <div className="absolute inset-x-0 top-6 h-px bg-linha" />
      <div className="absolute top-3 h-7 w-px bg-suave" style={{ left: pos(referencia) }} />
      <span className="absolute top-10 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-suave tabular-nums" style={{ left: pos(referencia) }}>
        {rotuloRef}
      </span>
      <span
        className="absolute top-6 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-papel bg-acento shadow-[0_0_0_1px_var(--acento)]"
        style={{ left: pos(pcpm) }}
      />
      <span className="absolute -top-1 -translate-x-1/2 text-xs font-bold text-acento-texto tabular-nums" style={{ left: pos(pcpm) }}>
        {pcpm}
      </span>
    </div>
  );
}

export function Resultado(props: Props) {
  const { idioma, id, textoId, titulo, corpo, idiomaTexto, apelido, ano, resultado, audioUrl, onLerDeNovo, roteiro } = props;
  const t = textos[idioma];
  const r = t.resultado;
  const audio = useRef<HTMLAudioElement>(null);
  const fimTrecho = useRef<number | null>(null);
  const vigia = useRef<number | null>(null);
  const [tocando, setTocando] = useState<number | "tudo" | null>(null);
  const [contagem, setContagem] = useState(props.contagemInicial === null ? "" : String(props.contagemInicial));
  const [salvando, setSalvando] = useState<"nao" | "sim" | "ok" | "erro">(props.contagemInicial === null ? "nao" : "ok");

  const segmentos = useMemo(() => segmentar(corpo), [corpo]);
  const itens = resultado.itens;
  const referencia = REFERENCIA_PCPM[ano];
  const ultimaLida = itens.findLastIndex((i) => i.marca !== "nao_lida");
  const classificacao = classificar(resultado, ano, idiomaTexto);
  const posicaoNivel = NIVEIS.indexOf(classificacao.nivel);

  const extrasApos = useMemo(() => {
    const mapa = new Map<number, Extra[]>();
    for (const extra of resultado.extras) {
      let alvo = -1;
      for (const item of itens) if (item.inicio !== undefined && item.inicio <= extra.inicio) alvo = item.indice;
      mapa.set(alvo, [...(mapa.get(alvo) ?? []), extra]);
    }
    return mapa;
  }, [resultado.extras, itens]);

  const presentes = useMemo(() => {
    const marcas = new Set<string>(itens.map((i) => i.marca));
    if (itens.some((i) => i.hesitacao)) marcas.add("hesitacao");
    if (itens.some(silabada)) marcas.add("silabada");
    for (const e of resultado.extras) marcas.add(e.tipo);
    const ordem = ["correta", "trocada", "pulada", "autocorrecao", "silabada", "hesitacao", "repeticao", "insercao", "nao_lida"] as const;
    return ordem.filter((m) => marcas.has(m) || m === "correta");
  }, [itens, resultado.extras]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const corrigir = () => {
      if (a.duration !== Infinity) return;
      a.addEventListener("durationchange", () => (a.currentTime = 0), { once: true });
      a.currentTime = 1e101;
    };
    a.addEventListener("loadedmetadata", corrigir);
    return () => {
      a.removeEventListener("loadedmetadata", corrigir);
      if (vigia.current) clearInterval(vigia.current);
    };
  }, [audioUrl]);

  function vigiar() {
    const a = audio.current;
    if (a && fimTrecho.current !== null && a.currentTime >= fimTrecho.current) a.pause();
  }

  function tocar(item: { inicio: number; fim: number }, chave: number) {
    const a = audio.current;
    if (!a) return;
    a.currentTime = Math.max(0, item.inicio / 1000 - 0.08);
    fimTrecho.current = item.fim / 1000 + 0.12;
    setTocando(chave);
    a.play().catch(() => setTocando(null));
    if (vigia.current) clearInterval(vigia.current);
    vigia.current = window.setInterval(vigiar, 25);
  }

  function tocarTudo() {
    const a = audio.current;
    if (!a) return;
    if (tocando === "tudo") {
      a.pause();
      return;
    }
    fimTrecho.current = null;
    a.currentTime = 0;
    setTocando("tudo");
    a.play().catch(() => setTocando(null));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(contagem);
    if (contagem.trim() === "" || !Number.isInteger(n) || n < 0 || n > 400) {
      setSalvando("erro");
      return;
    }
    setSalvando("sim");
    const resposta = await fetch(`/api/leituras/${id}/contagem`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contagem: n }),
    }).catch(() => null);
    setSalvando(resposta?.ok ? "ok" : "erro");
  }

  function palavra(item: ItemTexto, antes: string, nucleo: string, depois: string) {
    const podeTocar = audioUrl && item.inicio !== undefined && item.fim !== undefined;
    const silabando = silabada(item);
    const rotuloMarca =
      item.marca === "correta"
        ? null
        : item.marca === "trocada" || item.marca === "autocorrecao"
          ? `${r.lido[item.marca]}, ${r.disse(limpo(item.dito ?? ""))}`
          : r.lido[item.marca];
    const rotulo = [rotuloMarca, silabando ? r.lido.silabada : null].filter(Boolean).join(", ");
    const marcado =
      (item.marca === "trocada" || item.marca === "autocorrecao") && item.dito ? (
        <ruby>
          <span className={ESTILO[item.marca]}>{nucleo}</span>
          <rt className={`font-semibold not-italic ${item.marca === "trocada" ? "text-erro" : "text-ok line-through"}`}>{limpo(item.dito)}</rt>
        </ruby>
      ) : (
        <span className={ESTILO[item.marca]}>{nucleo}</span>
      );
    const conteudo = silabando ? <span className={ESTILO_SILABADA}>{marcado}</span> : marcado;
    const interno = (
      <>
        {item.hesitacao && (
          <>
            <Hesitacao />
            <span className="sr-only">({r.pausaLonga}) </span>
          </>
        )}
        {conteudo}
        {rotulo && <span className="sr-only"> ({rotulo})</span>}
      </>
    );
    return (
      <>
        {antes}
        {podeTocar ? (
          <button
            type="button"
            onClick={() => tocar({ inicio: item.inicio!, fim: item.fim! }, item.indice)}
            className={`-mx-1 rounded-lg px-1 transition hover:bg-acento-suave ${tocando === item.indice ? "bg-acento-suave ring-2 ring-acento" : ""}`}
          >
            {interno}
          </button>
        ) : (
          interno
        )}
        {depois}
      </>
    );
  }

  const acimaDaReferencia = referencia !== undefined && resultado.pcpm >= referencia;

  return (
    <div className="entrar flex flex-col gap-12">
      {audioUrl && (
        <audio
          ref={audio}
          src={audioUrl}
          preload="auto"
          onPause={() => {
            setTocando(null);
            if (vigia.current) clearInterval(vigia.current);
          }}
          onEnded={() => setTocando(null)}
          className="hidden"
        />
      )}

      <section aria-labelledby="pontuacao" className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <p className="text-sm font-semibold text-suave">
            <span lang={idiomaTexto}>{titulo}</span>
            <span className="mx-2 text-linha" aria-hidden>
              |
            </span>
            {t.leitura.leitor(apelido, ano)}
          </p>
          <h1 id="pontuacao" className="mt-4 flex flex-col">
            <span className="font-display text-[5.5rem] font-bold leading-[0.9] tracking-tighter tabular-nums sm:text-[7rem]">{resultado.pcpm}</span>
            <span className="mt-3 text-lg">
              <abbr title={t.metricaLonga} className="font-semibold no-underline">
                {t.metrica}
              </abbr>
              <span className="text-suave">, {t.metricaLonga}</span>
            </span>
          </h1>
          <div className="mt-6 border-l-4 border-acento pl-4">
            <p className="text-sm font-semibold text-suave">{r.nivel}</p>
            <p className="mt-0.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{r.niveis[classificacao.nivel]}</p>
            <div className="mt-2 flex max-w-60 gap-1" aria-hidden>
              {NIVEIS.map((n, k) => (
                <span key={n} className={`h-1.5 flex-1 rounded-full ${k <= posicaoNivel ? "bg-acento" : "bg-linha"}`} />
              ))}
            </div>
            <p className="mt-2 max-w-[52ch] leading-relaxed">{r.porque(classificacao.nivel, classificacao.motivo, ano)}</p>
            <p className="mt-1 max-w-[52ch] text-xs leading-relaxed text-suave">{r.nivelAviso}</p>
          </div>
          {referencia !== undefined && (
            <>
              <Escala pcpm={resultado.pcpm} referencia={referencia} rotuloRef={r.rotuloRef(referencia)} />
              <p className="mt-2 flex items-center gap-2 font-semibold">
                {acimaDaReferencia ? (
                  <ArrowUp size={18} weight="bold" className="text-ok" aria-hidden />
                ) : (
                  <ArrowDown size={18} weight="bold" className="text-pausa" aria-hidden />
                )}
                {r.referencia(ano, referencia)}, {acimaDaReferencia ? r.acima : r.abaixo}
              </p>
              <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-suave">{r.referenciaNota}</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:pt-10">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-linha bg-linha">
            {[
              { rotulo: r.corretas, valor: resultado.corretas, icone: <CheckCircle size={18} weight="fill" className="text-ok" aria-hidden /> },
              { rotulo: r.erros, valor: resultado.erros, icone: null },
              { rotulo: r.lidas, valor: resultado.lidas, icone: null },
              { rotulo: r.tempo, valor: r.segundos(resultado.segundos), icone: null },
            ].map((d) => (
              <div key={d.rotulo} className="flex flex-col-reverse gap-1 bg-superficie p-4 sm:p-5">
                <dt className="flex items-center gap-1.5 text-sm text-suave">
                  {d.icone}
                  {d.rotulo}
                </dt>
                <dd className="font-display text-3xl font-semibold tabular-nums sm:text-4xl">{d.valor}</dd>
              </div>
            ))}
          </dl>
          {resultado.lidas === 0 && (
            <p role="status" className="rounded-2xl border border-pausa/40 bg-pausa-suave px-4 py-3 text-pausa">
              {r.semFala}
            </p>
          )}
        </div>
      </section>

      {roteiro && roteiro.length > 0 && <PainelRoteiro idioma={idioma} idiomaTexto={idiomaTexto} corpo={corpo} roteiro={roteiro} resultado={resultado} />}

      <section aria-labelledby="texto-marcado">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="texto-marcado" className="font-display text-2xl font-semibold tracking-tight">
              {r.texto}
            </h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-suave">
              {audioUrl ? (
                r.tocarAjuda
              ) : (
                <>
                  <SpeakerSlash size={16} weight="bold" className="shrink-0" aria-hidden />
                  {r.semAudio}
                </>
              )}
            </p>
          </div>
          {audioUrl && (
            <button type="button" onClick={tocarTudo} className={`${secundario} min-h-11 py-2`}>
              {tocando === "tudo" ? <Pause size={18} weight="fill" aria-hidden /> : <Play size={18} weight="fill" aria-hidden />}
              {tocando === "tudo" ? r.pausar : r.ouvirTudo}
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,50rem)_16rem] lg:justify-between">
          <div className="folha rounded-2xl border border-linha px-5 py-7 sm:px-10 sm:py-10">
            <p lang={idiomaTexto} className="max-w-[38ch] text-[1.35rem] leading-[2.5] sm:text-[1.6rem]">
              {extrasApos.get(-1)?.map((e, k) => (
                <Fragment key={`x${k}`}>
                  <Chip tipo={e.tipo} texto={e.texto} rotulo={r.extra[e.tipo]} />{" "}
                </Fragment>
              ))}
              {segmentos.map((s, k) => {
                if (s.tipo === "resto") return <Fragment key={k}>{s.texto}</Fragment>;
                const item = itens[s.indice];
                if (!item) return <Fragment key={k}>{s.antes + s.nucleo + s.depois}</Fragment>;
                return (
                  <Fragment key={k}>
                    {palavra(item, s.antes, s.nucleo, s.depois)}
                    {extrasApos.get(s.indice)?.map((e, j) => (
                      <Fragment key={j}>
                        {" "}
                        <Chip tipo={e.tipo} texto={e.texto} rotulo={r.extra[e.tipo]} />
                      </Fragment>
                    ))}
                    {s.indice === ultimaLida && ultimaLida < itens.length - 1 && (
                      <>
                        {" "}
                        <span className="inline-flex items-center gap-1 rounded-md bg-acento-suave px-1.5 align-[0.15em] text-[0.62em] font-semibold leading-[1.6] text-acento-texto">
                          <FlagPennant size="1em" weight="fill" aria-hidden />
                          {r.parouAqui}
                        </span>
                      </>
                    )}
                  </Fragment>
                );
              })}
            </p>
          </div>

          <aside aria-labelledby="legenda" className="lg:pt-2">
            <h3 id="legenda" className="text-sm font-semibold text-suave">
              {r.legenda}
            </h3>
            <ul className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {presentes.map((m) => (
                <li key={m} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-2 leading-snug">
                  <span className="text-base">
                    <Amostra tipo={m} />
                  </span>
                  <span>{r.marcas[m]}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section aria-labelledby="contagem" className="grid gap-8 border-t border-linha pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <form onSubmit={salvar} className="flex flex-col gap-2">
          <h2 id="contagem" className="font-display text-xl font-semibold tracking-tight">
            {r.contagem}
          </h2>
          <p className="max-w-[52ch] text-sm leading-relaxed text-suave">{r.contagemAjuda}</p>
          <label htmlFor="contagem-valor" className="mt-3 font-semibold">
            {r.contagemRotulo}
          </label>
          <div className="flex gap-2">
            <input
              id="contagem-valor"
              type="number"
              inputMode="numeric"
              min={0}
              max={400}
              value={contagem}
              onChange={(e) => {
                setContagem(e.target.value);
                if (salvando !== "sim") setSalvando("nao");
              }}
              className={`${campo} max-w-32 tabular-nums`}
            />
            <button type="submit" disabled={salvando === "sim"} className={`${secundario} shrink-0`}>
              {salvando === "ok" && <Check size={18} weight="bold" className="text-ok" aria-hidden />}
              {r.salvar}
            </button>
          </div>
          <p role="status" className={`min-h-6 text-sm font-semibold ${salvando === "erro" ? "text-erro" : "text-ok"}`}>
            {salvando === "ok" ? r.salvo : salvando === "erro" ? r.erroSalvar : ""}
          </p>
        </form>

        <div className="flex flex-col gap-3 sm:flex-row lg:items-start lg:justify-end lg:pt-9">
          {onLerDeNovo ? (
            <button type="button" onClick={onLerDeNovo} className={primario}>
              <ArrowCounterClockwise size={18} weight="bold" aria-hidden />
              {r.lerDeNovo}
            </button>
          ) : (
            <Link href={`/ler/${textoId}${sufixo(idioma)}`} className={primario}>
              <ArrowCounterClockwise size={18} weight="bold" aria-hidden />
              {r.lerDeNovo}
            </Link>
          )}
          <Link href={`/${sufixo(idioma)}`} className={secundario}>
            {r.outroTexto}
          </Link>
        </div>
      </section>
    </div>
  );
}
