"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { sufixo, textos, type Idioma } from "@/lib/i18n";
import { salvarLeitor, salvarUltimoTexto, ultimoTexto, useLeitor } from "@/lib/leitor";
import { sortearTexto } from "@/lib/textos";
import { campo, primario } from "@/components/ui";

export function EscolhaTexto({ idioma }: { idioma: Idioma }) {
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

  function comecar() {
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
    const texto = sortearTexto(idioma, anoAtual, ultimoTexto());
    if (!texto) return;
    salvarLeitor({ apelido: nome, ano: anoAtual });
    salvarUltimoTexto(texto.id);
    router.push(`/ler/${texto.id}${sufixo(idioma)}`);
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={comecar}
          className={`${primario} w-full`}
        >
          {t.sorteio.comecar}
          <ArrowRight size={22} weight="bold" aria-hidden />
        </button>
        <p className="text-center text-sm text-suave">{t.sorteio.ajuda}</p>
      </div>
    </div>
  );
}
