import type { Resultado } from "@/lib/alinhar";
import { REFERENCIA_PCPM } from "@/lib/referencias";

export type Nivel = "nao_le_palavras" | "silabando" | "palavra_por_palavra" | "em_desenvolvimento" | "fluente";
export const NIVEIS: Nivel[] = ["nao_le_palavras", "silabando", "palavra_por_palavra", "em_desenvolvimento", "fluente"];

export const MINIMO_CORRETAS = 5;
export const FRACAO_SILABANDO = 0.4;
export const FRACAO_PALAVRA_POR_PALAVRA = 0.5;
export const PAUSA_PALAVRA_POR_PALAVRA_MS = 500;
export const ACURACIA_FLUENTE = 0.95;
const REFERENCIAS: Record<"pt" | "en", Record<number, number>> = { pt: REFERENCIA_PCPM, en: REFERENCIA_PCPM };

export interface Motivo {
  corretas: number;
  lidas: number;
  silabadas: number;
  pcpm: number;
  referencia: number;
  pausaMediana: number;
  acuracia: number;
}

export interface Classificacao { nivel: Nivel; motivo: Motivo }

function mediana(valores: number[]) {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const meio = v.length >> 1;
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

function pausaMediana(resultado: Resultado) {
  const lidas = resultado.itens.filter((i) => i.marca !== "nao_lida" && i.marca !== "pulada" && i.inicio !== undefined && i.fim !== undefined);
  const pausas: number[] = [];
  for (let k = 1; k < lidas.length; k++) {
    if (lidas[k].inicio === lidas[k - 1].inicio) continue;
    pausas.push(Math.max(0, lidas[k].inicio! - lidas[k - 1].fim!));
  }
  return mediana(pausas);
}

export function classificar(resultado: Resultado, ano: number, idioma: "pt" | "en"): Classificacao {
  const referencia = REFERENCIAS[idioma][ano] ?? 0;
  const silabadas = resultado.silabadas ?? 0;
  const { corretas, lidas, pcpm } = resultado;
  const acuracia = lidas ? corretas / lidas : 0;
  const motivo: Motivo = { corretas, lidas, silabadas, pcpm, referencia, pausaMediana: pausaMediana(resultado), acuracia };
  const nivel: Nivel =
    corretas < MINIMO_CORRETAS
      ? "nao_le_palavras"
      : silabadas / lidas >= FRACAO_SILABANDO
        ? "silabando"
        : pcpm < FRACAO_PALAVRA_POR_PALAVRA * referencia && motivo.pausaMediana >= PAUSA_PALAVRA_POR_PALAVRA_MS
          ? "palavra_por_palavra"
          : pcpm < referencia || acuracia < ACURACIA_FLUENTE
            ? "em_desenvolvimento"
            : "fluente";
  return { nivel, motivo };
}
