"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { sufixo, textos, type Idioma } from "@/lib/i18n";
import { salvarLeitor, useLeitor } from "@/lib/leitor";
import { campo } from "@/components/ui";

export interface ResumoTexto {
  id: string;
  ano: number;
  titulo: string;
  inicio: string;
  palavras: number;
}

export function EscolhaTexto({ idioma, lista }: { idioma: Idioma; lista: ResumoTexto[] }) {
  const t = textos[idioma];
  const router = useRouter();
  const salvo = useLeitor();
  const [apelido, setApelido] = useState<string | null>(null);
  const [ano, setAno] = useState<number | null>(null);
  const [erro, setErro] = useState<"apelido" | "ano" | null>(null);
  const refApelido = useRef<HTMLInputElement>(null);
  const refAno = useRef<HTMLFieldSetElement>(null);

  const apelidoAtual = apelido ?? salvo?.apelido ?? "";
  const anoAtual = ano ?? salvo?.ano ?? null;

  function escolher(id: string) {
    const nome = apelidoAtual.trim();
    if (!nome) {
      setErro("apelido");
      refApelido.current?.focus();
      refApelido.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (!anoAtual) {
      setErro("ano");
      refAno.current?.querySelector("input")?.focus();
      refAno.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    salvarLeitor({ apelido: nome, ano: anoAtual });
    router.push(`/ler/${id}${sufixo(idioma)}`);
  }

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="leitor" className="rounded-2xl border border-linha bg-superficie p-5 sm:p-7">
        <h2 id="leitor" className="font-display text-xl font-semibold tracking-tight">
          {t.inicio.leitor}
        </h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-2">
            <label htmlFor="apelido" className="font-semibold">
              {t.inicio.apelido}
            </label>
            <input
              ref={refApelido}
              id="apelido"
              value={apelidoAtual}
              onChange={(e) => {
                setApelido(e.target.value);
                if (erro === "apelido") setErro(null);
              }}
              maxLength={40}
              autoComplete="off"
              aria-describedby="apelido-ajuda"
              aria-invalid={erro === "apelido" || undefined}
              className={campo}
            />
            <p id="apelido-ajuda" className={`text-sm ${erro === "apelido" ? "font-semibold text-erro" : "text-suave"}`}>
              {erro === "apelido" ? t.inicio.faltaApelido : t.inicio.apelidoAjuda}
            </p>
          </div>
          <fieldset ref={refAno} className="flex flex-col gap-2" aria-describedby={erro === "ano" ? "ano-erro" : undefined}>
            <legend className="mb-2 font-semibold">{t.inicio.anoLeitor}</legend>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="relative">
                  <input
                    type="radio"
                    name="ano"
                    value={n}
                    checked={anoAtual === n}
                    onChange={() => {
                      setAno(n);
                      if (erro === "ano") setErro(null);
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex size-12 cursor-pointer items-center justify-center rounded-xl border border-linha bg-papel font-display text-lg font-semibold tabular-nums transition peer-checked:border-acento peer-checked:bg-acento peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento hover:border-suave">
                    {n}
                  </span>
                  <span className="sr-only">{t.ano(n)}</span>
                </label>
              ))}
            </div>
            {erro === "ano" && (
              <p id="ano-erro" className="text-sm font-semibold text-erro">
                {t.inicio.faltaAno}
              </p>
            )}
          </fieldset>
        </div>
      </section>

      <section aria-labelledby="textos">
        <h2 id="textos" className="font-display text-xl font-semibold tracking-tight">
          {t.inicio.textos}
        </h2>
        <p className="mt-1 text-sm text-suave">{t.inicio.textosAjuda}</p>
        <ul className="mt-5 flex flex-col gap-3">
          {lista.map((texto) => (
            <li key={texto.id}>
              <button
                type="button"
                onClick={() => escolher(texto.id)}
                className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-linha bg-papel p-4 text-left transition hover:border-acento/60 active:scale-[0.99] sm:gap-5 sm:p-5"
              >
                <span className="flex size-14 flex-col items-center justify-center rounded-xl bg-acento-suave text-acento-texto">
                  <span className="font-display text-2xl font-bold leading-none tabular-nums">{texto.ano}</span>
                  <span className="mt-0.5 text-[11px] font-semibold leading-none">{t.inicio.rotuloAno}</span>
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold leading-snug tracking-tight">{texto.titulo}</span>
                  <span className="mt-1 block truncate text-sm text-suave">{texto.inicio}</span>
                  <span className="mt-1 block text-sm text-suave">
                    {t.ano(texto.ano)}, {t.inicio.palavras(texto.palavras)}
                  </span>
                </span>
                <ArrowRight size={22} weight="bold" className="text-acento-texto transition group-hover:translate-x-0.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
