import { describe, expect, it } from "vitest";
import {
  ACURACIA_FLUENTE,
  FRACAO_PALAVRA_POR_PALAVRA,
  FRACAO_SILABANDO,
  MINIMO_CORRETAS,
  PAUSA_PALAVRA_POR_PALAVRA_MS,
  classificar,
} from "@/lib/classificacao";
import type { ItemTexto, Marca, Resultado } from "@/lib/alinhar";

interface Opcoes { corretas: number; erros?: number; silabadas?: number; pcpm: number; pausa?: number }

function resultado({ corretas, erros = 0, silabadas = 0, pcpm, pausa = 100 }: Opcoes): Resultado {
  const itens: ItemTexto[] = [];
  let t = 0;
  for (let k = 0; k < corretas + erros; k++) {
    const marca: Marca = k < corretas ? "correta" : "trocada";
    itens.push({ indice: k, esperada: "casa", marca, inicio: t, fim: t + 300, silabada: k < silabadas || undefined });
    t += 300 + pausa;
  }
  return { itens, extras: [], corretas, erros, lidas: corretas + erros, segundos: 60, pcpm, silabadas };
}

describe("classificar", () => {
  it("exporta as constantes", () => {
    expect([MINIMO_CORRETAS, FRACAO_SILABANDO, FRACAO_PALAVRA_POR_PALAVRA, PAUSA_PALAVRA_POR_PALAVRA_MS, ACURACIA_FLUENTE]).toEqual([5, 0.4, 0.5, 500, 0.95]);
  });

  it("menos de 5 corretas: não lê palavras", () => {
    expect(classificar(resultado({ corretas: 4, pcpm: 4 }), 1, "pt").nivel).toBe("nao_le_palavras");
    expect(classificar(resultado({ corretas: 5, pcpm: 200 }), 1, "pt").nivel).toBe("fluente");
    expect(classificar(resultado({ corretas: 0, pcpm: 0 }), 3, "pt").motivo.corretas).toBe(0);
  });

  it("40% ou mais das lidas silabadas: silabando", () => {
    const c = classificar(resultado({ corretas: 20, silabadas: 8, pcpm: 20 }), 2, "pt");
    expect(c.nivel).toBe("silabando");
    expect(c.motivo).toMatchObject({ silabadas: 8, lidas: 20 });
    expect(classificar(resultado({ corretas: 20, silabadas: 7, pcpm: 200 }), 2, "pt").nivel).toBe("fluente");
  });

  it("aceita resultado antigo sem silabadas", () => {
    const r = resultado({ corretas: 20, pcpm: 200 }) as Partial<Resultado>;
    delete r.silabadas;
    expect(classificar(r as Resultado, 2, "pt").nivel).toBe("fluente");
  });

  it("abaixo de metade da referência com pausas longas: palavra por palavra", () => {
    const c = classificar(resultado({ corretas: 20, pcpm: 55, pausa: 500 }), 3, "pt");
    expect(c.nivel).toBe("palavra_por_palavra");
    expect(c.motivo).toMatchObject({ pcpm: 55, referencia: 112, pausaMediana: 500 });
    expect(classificar(resultado({ corretas: 20, pcpm: 56, pausa: 500 }), 3, "pt").nivel).toBe("em_desenvolvimento");
    expect(classificar(resultado({ corretas: 20, pcpm: 55, pausa: 499 }), 3, "pt").nivel).toBe("em_desenvolvimento");
  });

  it("abaixo da referência ou com acurácia baixa: em desenvolvimento", () => {
    expect(classificar(resultado({ corretas: 20, pcpm: 111 }), 3, "pt").nivel).toBe("em_desenvolvimento");
    expect(classificar(resultado({ corretas: 20, pcpm: 112 }), 3, "pt").nivel).toBe("fluente");
    const baixa = classificar(resultado({ corretas: 18, erros: 2, pcpm: 150 }), 3, "en");
    expect(baixa.nivel).toBe("em_desenvolvimento");
    expect(baixa.motivo.acuracia).toBeCloseTo(0.9);
    expect(classificar(resultado({ corretas: 19, erros: 1, pcpm: 150 }), 3, "en").nivel).toBe("fluente");
  });

  it("pausa mediana entre palavras lidas, na ordem do texto", () => {
    const r = resultado({ corretas: 10, pcpm: 20 });
    r.itens[3].inicio = r.itens[2].fim! + 2000;
    r.itens[3].fim = r.itens[3].inicio + 300;
    expect(classificar(r, 3, "pt").motivo.pausaMediana).toBe(100);
  });
});
