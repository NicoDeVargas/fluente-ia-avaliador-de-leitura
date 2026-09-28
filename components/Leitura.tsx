"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Microphone, PencilSimple, Stop } from "@phosphor-icons/react";
import type { Resultado as TResultado } from "@/lib/alinhar";
import { sufixo, textos, type Idioma } from "@/lib/i18n";
import { salvarLeitor, useLeitor } from "@/lib/leitor";
import { Aviso, campo, primario, secundario } from "@/components/ui";
import { Resultado } from "@/components/Resultado";

const DURACAO = 60000;
const LIMITE = 70000;
const MINIMO = 5000;
const TIPOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

type Fase = "pronto" | "pedindo" | "gravando" | "analisando" | "resultado";
type Erro = "semMicrofone" | "semSuporte" | "curta" | "falhou" | "muitas" | "falhaGravacao";

interface Props {
  idioma: Idioma;
  textoId: string;
  titulo: string;
  corpo: string;
  anoTexto: number;
  idiomaTexto: "pt" | "en";
}

function extensao(tipo: string) {
  if (tipo.includes("mp4")) return "m4a";
  if (tipo.includes("ogg")) return "ogg";
  return "webm";
}

export function Leitura({ idioma, textoId, titulo, corpo, anoTexto, idiomaTexto }: Props) {
  const t = textos[idioma];
  const l = t.leitura;
  const leitor = useLeitor();
  const [editando, setEditando] = useState(false);
  const [fase, setFase] = useState<Fase>("pronto");
  const [erro, setErro] = useState<Erro | null>(null);
  const [decorrido, setDecorrido] = useState(0);
  const [gravacao, setGravacao] = useState<{ blob: Blob; url: string } | null>(null);
  const [saida, setSaida] = useState<{
    id: string;
    resultado: TResultado;
  } | null>(null);
  const inicio = useRef(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const relogio = useRef<number | null>(null);
  const cancelado = useRef(false);
  const descartar = useRef(false);
  const url = useRef<string | null>(null);

  useEffect(() => {
    cancelado.current = false;
    return () => {
      cancelado.current = true;
      if (relogio.current) clearInterval(relogio.current);
      if (gravador.current?.state === "recording") gravador.current.stop();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  async function enviar(blob: Blob) {
    if (!leitor) return;
    setErro(null);
    setFase("analisando");
    const forma = new FormData();
    forma.append("audio", new File([blob], `leitura.${extensao(blob.type)}`, { type: blob.type }));
    forma.append("textoId", textoId);
    forma.append("apelido", leitor.apelido);
    forma.append("ano", String(leitor.ano));
    forma.append("idioma", idiomaTexto);
    const resposta = await fetch("/api/leituras", {
      method: "POST",
      body: forma,
    }).catch(() => null);
    if (cancelado.current) return;
    if (!resposta?.ok) {
      setErro(resposta?.status === 429 ? "muitas" : "falhou");
      setFase("pronto");
      return;
    }
    const dados = (await resposta.json().catch(() => null)) as {
      id: string;
      resultado: TResultado;
    } | null;
    if (cancelado.current) return;
    if (!dados) {
      setErro("falhou");
      setFase("pronto");
      return;
    }
    setSaida(dados);
    setFase("resultado");
    window.history.replaceState(null, "", `/leitura/${dados.id}${sufixo(idioma)}`);
    window.scrollTo({ top: 0 });
  }

  async function comecar() {
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErro("semSuporte");
      return;
    }
    setFase("pedindo");
    let fluxo: MediaStream;
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      if (cancelado.current) return;
      setErro("semMicrofone");
      setFase("pronto");
      return;
    }
    const parar = () => fluxo.getTracks().forEach((x) => x.stop());
    if (cancelado.current) {
      parar();
      return;
    }
    const tipo = TIPOS.find((x) => MediaRecorder.isTypeSupported(x));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(fluxo, tipo ? { mimeType: tipo } : undefined);
    } catch {
      parar();
      setErro("semSuporte");
      setFase("pronto");
      return;
    }
    const partes: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) partes.push(e.data);
    };
    rec.onerror = () => {
      if (relogio.current) clearInterval(relogio.current);
      if (rec.state !== "inactive") {
        descartar.current = true;
        rec.stop();
      } else parar();
      if (cancelado.current) return;
      setErro("falhaGravacao");
      setFase("pronto");
    };
    rec.onstop = () => {
      parar();
      if (relogio.current) clearInterval(relogio.current);
      if (cancelado.current) return;
      if (descartar.current) {
        descartar.current = false;
        return;
      }
      const duracao = Date.now() - inicio.current;
      if (duracao < MINIMO) {
        setErro("curta");
        setFase("pronto");
        return;
      }
      const blob = new Blob(partes, {
        type: rec.mimeType || tipo || "audio/webm",
      });
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      setGravacao({ blob, url: url.current });
      enviar(blob);
    };
    gravador.current = rec;
    rec.start(1000);
    inicio.current = Date.now();
    setDecorrido(0);
    setFase("gravando");
    relogio.current = window.setInterval(() => {
      const passou = Date.now() - inicio.current;
      setDecorrido(Math.min(LIMITE, passou));
      if (passou >= LIMITE && rec.state === "recording") rec.stop();
    }, 200);
  }

  function terminar() {
    if (gravador.current?.state === "recording") gravador.current.stop();
  }

  function cancelar() {
    descartar.current = true;
    terminar();
    setFase("pronto");
  }

  function lerDeNovo() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setSaida(null);
    setGravacao(null);
    setErro(null);
    setFase("pronto");
    window.history.replaceState(null, "", `/ler/${textoId}${sufixo(idioma)}`);
    window.scrollTo({ top: 0 });
  }

  if (fase === "resultado" && saida && leitor) {
    return (
      <div className="pb-20 pt-2">
        <Resultado
          idioma={idioma}
          id={saida.id}
          textoId={textoId}
          titulo={titulo}
          corpo={corpo}
          idiomaTexto={idiomaTexto}
          apelido={leitor.apelido}
          ano={leitor.ano}
          resultado={saida.resultado}
          contagemInicial={null}
          audioUrl={gravacao?.url}
          onLerDeNovo={lerDeNovo}
        />
      </div>
    );
  }

  const restante = Math.max(0, Math.ceil((DURACAO - decorrido) / 1000));
  const ocupado = fase === "gravando" || fase === "analisando" || fase === "pedindo";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${sufixo(idioma)}`}
          aria-disabled={ocupado || undefined}
          className={`-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-suave hover:text-tinta ${ocupado ? "pointer-events-none opacity-40" : ""}`}
        >
          <ArrowLeft size={16} weight="bold" aria-hidden />
          {l.voltar}
        </Link>
        {leitor && !editando && (
          <p className="flex items-center gap-1 text-sm text-suave">
            <span className="font-semibold text-tinta">{l.leitor(leitor.apelido, leitor.ano)}</span>
            {!ocupado && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-semibold hover:text-tinta"
              >
                <PencilSimple size={16} weight="bold" aria-hidden />
                {l.trocar}
              </button>
            )}
          </p>
        )}
      </div>

      {(!leitor || editando) && (
        <FormLeitor idioma={idioma} anoPadrao={leitor?.ano ?? anoTexto} apelidoPadrao={leitor?.apelido ?? ""} onPronto={() => setEditando(false)} />
      )}

      <div>
        <p className="text-sm font-semibold text-suave">
          {t.ano(anoTexto)}
          <span className="mx-2 text-linha" aria-hidden>
            |
          </span>
          <span lang={idiomaTexto}>{titulo}</span>
        </p>
        <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-suave">{l.instrucao}</p>
      </div>

      <article
        className={`folha rounded-2xl border px-5 py-8 transition-colors sm:px-12 sm:py-12 ${fase === "gravando" ? "border-acento/50" : "border-linha"}`}
      >
        <p lang={idiomaTexto} className="max-w-[32ch] text-[1.6rem] leading-[1.85] tracking-[0.005em] sm:text-[2.1rem] sm:leading-[1.8]">
          {corpo}
        </p>
      </article>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-fundo/92 backdrop-blur supports-[backdrop-filter]:bg-fundo/80">
        {fase === "gravando" && (
          <div
            className="h-1 bg-acento transition-[width] duration-200 ease-linear"
            style={{ width: `${Math.min(1, decorrido / DURACAO) * 100}%` }}
            aria-hidden
          />
        )}
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4">
          {erro && (
            <Aviso
              acao={
                erro === "falhou" && gravacao ? (
                  <button type="button" onClick={() => enviar(gravacao.blob)} className={`${secundario} min-h-11 shrink-0 py-2`}>
                    {l.tentarDeNovo}
                  </button>
                ) : undefined
              }
            >
              {l[erro]}
            </Aviso>
          )}
          {fase === "gravando" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex flex-1 items-center gap-3" role="timer" aria-live="off">
                  <span className="relative flex size-3" aria-hidden>
                    <span className="pulsar absolute inset-0 rounded-full bg-erro" />
                    <span className="relative size-3 rounded-full bg-erro" />
                  </span>
                  <span className="sr-only">{l.gravando}</span>
                  <span className="font-display text-4xl font-semibold tabular-nums leading-none">{restante}</span>
                  <span className="text-sm text-suave">s {l.restante}</span>
                </div>
                <button type="button" onClick={cancelar} className={`${secundario} px-4`}>
                  {l.cancelar}
                </button>
                <button type="button" onClick={terminar} className={`${primario} sm:min-w-36`}>
                  <Stop size={18} weight="fill" aria-hidden />
                  {l.terminei}
                </button>
              </div>
              <p className="text-sm text-suave">{l.atrasado}</p>
            </div>
          ) : fase === "analisando" ? (
            <div role="status" className="flex min-h-12 items-center gap-3">
              <span className="brilho size-3 rounded-full bg-acento" aria-hidden />
              <div>
                <p className="font-semibold">{l.analisando}</p>
                <p className="text-sm text-suave">{l.analisandoAjuda}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="hidden flex-1 text-sm text-suave sm:block">{l.dica}</p>
              <button
                type="button"
                onClick={comecar}
                disabled={!leitor || editando || fase === "pedindo"}
                className={`${primario} w-full sm:w-auto sm:min-w-64`}
              >
                <Microphone size={20} weight="fill" aria-hidden />
                {fase === "pedindo" ? l.pedindoMicrofone : erro === "curta" || erro === "falhou" ? l.lerDeNovo : l.comecar}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormLeitor({ idioma, anoPadrao, apelidoPadrao, onPronto }: { idioma: Idioma; anoPadrao: number; apelidoPadrao: string; onPronto: () => void }) {
  const t = textos[idioma];
  const [apelido, setApelido] = useState(apelidoPadrao);
  const [ano, setAno] = useState(anoPadrao);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!apelido.trim()) return;
        salvarLeitor({ apelido: apelido.trim(), ano });
        onPronto();
      }}
      className="grid gap-4 rounded-2xl border border-linha bg-superficie p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="apelido-leitura" className="font-semibold">
          {t.inicio.apelido}
        </label>
        <input id="apelido-leitura" required maxLength={40} value={apelido} onChange={(e) => setApelido(e.target.value)} autoComplete="off" className={campo} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="ano-leitura" className="font-semibold">
          {t.inicio.anoLeitor}
        </label>
        <select id="ano-leitura" value={ano} onChange={(e) => setAno(Number(e.target.value))} className={`${campo} pr-10`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {t.ano(n)}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={primario}>
        {t.leitura.salvarApelido}
      </button>
    </form>
  );
}
