import { describe, expect, it } from "vitest";
import { TEXTOS } from "@/lib/textos";
import { contarSilabas } from "@/lib/silabas";
import type { ItemTexto, Resultado } from "@/lib/alinhar";
import { detectar, gabaritoDoRoteiro, gerarRoteiro, inicioFalso, palavrasDoTexto, resumirRoteiros, semente, type Instrucao } from "@/lib/roteiro";

const FIM_DE_FRASE = /[.!?…:;]["”’)]*$/;

function resultado(itens: Partial<ItemTexto>[], extras: Resultado["extras"] = []): Resultado {
  const completos = itens.map((i, indice) => ({ indice, esperada: `p${indice}`, marca: "correta" as const, inicio: indice * 500, fim: indice * 500 + 400, ...i }));
  const corretas = completos.filter((i) => i.marca === "correta" || i.marca === "autocorrecao").length;
  const erros = completos.filter((i) => i.marca === "trocada" || i.marca === "pulada").length;
  return { itens: completos, extras, corretas, erros, lidas: corretas + erros, segundos: 60, pcpm: corretas, silabadas: 0 };
}

describe("gerarRoteiro", () => {
  it("é determinístico com a mesma semente", () => {
    const t = TEXTOS[2];
    expect(gerarRoteiro(t.corpo, t.idioma, t.ano, semente(7))).toEqual(gerarRoteiro(t.corpo, t.idioma, t.ano, semente(7)));
  });

  it("respeita as regras em todos os textos", () => {
    for (const t of TEXTOS) {
      const palavras = palavrasDoTexto(t.corpo);
      const normas = new Set(palavras.map((p) => p.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "")));
      for (let s = 0; s < 60; s++) {
        const roteiro = gerarRoteiro(t.corpo, t.idioma, t.ano, semente(s));
        expect(roteiro.length, t.id).toBeGreaterThanOrEqual(3);
        expect(roteiro.length).toBeLessThanOrEqual(t.ano <= 2 ? 4 : 5);
        expect(new Set(roteiro.map((i) => i.tipo)).size).toBe(roteiro.length);
        roteiro.forEach((i, k) => {
          expect(i.indice).toBeGreaterThanOrEqual(2);
          expect(i.fim).toBeLessThan(Math.max(14, Math.floor(palavras.length * 0.55)));
          if (k > 0) expect(i.indice - roteiro[k - 1].fim).toBeGreaterThan(3);
          if (i.tipo === "pula") {
            expect(i.fim - i.indice + 1).toBeGreaterThanOrEqual(3);
            expect(i.fim - i.indice + 1).toBeLessThanOrEqual(5);
            for (let j = i.indice; j < i.fim; j++) expect(FIM_DE_FRASE.test(palavras[j])).toBe(false);
          } else expect(i.fim).toBe(i.indice);
          if (i.tipo === "silaba") expect(contarSilabas(palavras[i.indice], t.idioma)).toBeGreaterThanOrEqual(3);
          if (i.tipo === "troca") {
            expect(normas.has(i.dizer!.normalize("NFD").replace(/\p{M}/gu, ""))).toBe(false);
            expect(i.dizer![0]).not.toBe(palavras[i.indice].toLowerCase()[0]);
          }
          if (i.tipo === "autocorrecao") expect(palavras[i.indice].toLowerCase().startsWith(i.dizer!)).toBe(true);
        });
      }
    }
  });

  it("mistura os tipos entre sementes", () => {
    const t = TEXTOS[3];
    const tipos = new Set(Array.from({ length: 30 }, (_, s) => gerarRoteiro(t.corpo, t.idioma, t.ano, semente(s)).map((i) => i.tipo)).flat());
    expect(tipos.size).toBe(5);
  });
});

describe("inicioFalso", () => {
  it("pega a primeira sílaba aproximada", () => {
    expect(inicioFalso("cavalo")).toBe("ca");
    expect(inicioFalso("escura,")).toBe("es");
    expect(inicioFalso("chuva")).toBe("chu");
  });
});

describe("gabaritoDoRoteiro", () => {
  const corpo = "um dois tres quatro cinco seis sete oito nove dez onze doze";
  const roteiro: Instrucao[] = [
    { tipo: "troca", indice: 1, fim: 1, dizer: "janela" },
    { tipo: "repete", indice: 3, fim: 3 },
    { tipo: "pula", indice: 5, fim: 7 },
    { tipo: "silaba", indice: 9, fim: 9 },
  ];

  it("segue as regras do gabarito humano", () => {
    expect(gabaritoDoRoteiro(roteiro, corpo, 11)).toEqual({ corretas: 8, erros: 4, silabadas: 1, errosPorIndice: [1, 5, 6, 7] });
  });

  it("corta no último índice alcançado", () => {
    expect(gabaritoDoRoteiro(roteiro, corpo, 6)).toEqual({ corretas: 4, erros: 3, silabadas: 0, errosPorIndice: [1, 5, 6] });
    expect(gabaritoDoRoteiro(roteiro, corpo, -1)).toEqual({ corretas: 0, erros: 0, silabadas: 0, errosPorIndice: [] });
  });
});

describe("detectar", () => {
  it("confere cada tipo", () => {
    const r = resultado(
      [{}, { marca: "trocada", dito: "janela" }, {}, {}, {}, { marca: "pulada" }, { marca: "pulada" }, {}, {}, { silabada: true }, { marca: "autocorrecao" }, {}, { marca: "nao_lida" }],
      [{ texto: "p3", inicio: 1600, fim: 1800, tipo: "repeticao" }],
    );
    expect(detectar({ tipo: "troca", indice: 1, fim: 1 }, r)).toBe("detectada");
    expect(detectar({ tipo: "repete", indice: 3, fim: 3 }, r)).toBe("detectada");
    expect(detectar({ tipo: "repete", indice: 8, fim: 8 }, r)).toBe("nao_detectada");
    expect(detectar({ tipo: "pula", indice: 5, fim: 6 }, r)).toBe("detectada");
    expect(detectar({ tipo: "pula", indice: 5, fim: 7 }, r)).toBe("nao_detectada");
    expect(detectar({ tipo: "silaba", indice: 9, fim: 9 }, r)).toBe("detectada");
    expect(detectar({ tipo: "silaba", indice: 8, fim: 8 }, r)).toBe("nao_detectada");
    expect(detectar({ tipo: "autocorrecao", indice: 10, fim: 10 }, r)).toBe("detectada");
    expect(detectar({ tipo: "troca", indice: 12, fim: 12 }, r)).toBe("nao_alcancada");
  });
});

describe("resumirRoteiros", () => {
  it("calcula as métricas agregadas", () => {
    const r1 = resultado([{}, { marca: "trocada" }, {}, { marca: "trocada" }, { silabada: true }]);
    const r2 = resultado([{}, {}, { marca: "pulada" }, { marca: "pulada" }, {}]);
    const resumo = resumirRoteiros([
      { leitor: "Ana", roteiro: [{ tipo: "troca", indice: 1, fim: 1 }], gabarito: { corretas: 4, erros: 1, silabadas: 0, errosPorIndice: [1] }, resultado: r1 },
      { leitor: " ana ", roteiro: [{ tipo: "pula", indice: 1, fim: 3 }], gabarito: { corretas: 2, erros: 3, silabadas: 0, errosPorIndice: [1, 2, 3] }, resultado: r2 },
    ]);
    expect(resumo.n).toBe(2);
    expect(resumo.leitores).toBe(1);
    expect(resumo.diferenca).toBe(1);
    expect(resumo.dentro1).toBe(1);
    expect(resumo.precisao).toBe(3 / 4);
    expect(resumo.revocacao).toBe(3 / 4);
    expect(resumo.porTipo.troca).toEqual({ detectadas: 1, total: 1 });
    expect(resumo.porTipo.pula).toEqual({ detectadas: 0, total: 1 });
    expect(resumo.silabadasForaDoRoteiro).toBe(1);
  });

  it("lida com lista vazia", () => {
    const resumo = resumirRoteiros([]);
    expect(resumo.n).toBe(0);
    expect(resumo.diferenca).toBeNull();
    expect(resumo.precisao).toBeNull();
  });
});
