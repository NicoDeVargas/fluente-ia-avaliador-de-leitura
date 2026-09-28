"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "@phosphor-icons/react";
import { sufixo, textos, type Idioma } from "@/lib/i18n";
import { salvarUltimoTexto } from "@/lib/leitor";
import { sortearTexto, type Texto } from "@/lib/textos";

interface Props { idioma: Idioma; textoId: string; idiomaTexto: Texto["idioma"]; ano: number; desativado?: boolean }

export function OutroTexto({ idioma, textoId, idiomaTexto, ano, desativado }: Props) {
  const router = useRouter();

  useEffect(() => {
    salvarUltimoTexto(textoId);
  }, [textoId]);

  function trocar() {
    const texto = sortearTexto(idiomaTexto, ano, textoId);
    if (!texto || texto.id === textoId) return;
    salvarUltimoTexto(texto.id);
    router.push(`/ler/${texto.id}${sufixo(idioma)}`);
  }

  return (
    <button
      type="button"
      onClick={trocar}
      disabled={desativado}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-suave hover:text-tinta disabled:pointer-events-none disabled:opacity-40"
    >
      <Shuffle size={16} weight="bold" aria-hidden />
      {textos[idioma].sorteio.outro}
    </button>
  );
}
