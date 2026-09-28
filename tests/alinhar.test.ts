import { describe, expect, it } from "vitest";
import { alinhar, normalizar, tokenizar, type PalavraLida } from "@/lib/alinhar";
import { TEXTOS } from "@/lib/textos";

function ler(fala: string, fimTotal: number, inicio = 0): PalavraLida[] {
  const partes = fala.split(" ").filter(Boolean);
  const passo = (fimTotal - inicio) / partes.length;
  return partes.map((texto, k) => ({ texto, inicio: inicio + k * passo, fim: inicio + (k + 1) * passo }));
}

const marcas = (r: ReturnType<typeof alinhar>) => r.itens.map((i) => i.marca);

describe("normalizar e tokenizar", () => {
  it("ignora acentos, pontuação e maiúsculas", () => {
    expect(normalizar("Pássaro,")).toBe("passaro");
    expect(normalizar("“Caça!”")).toBe("caca");
    expect(tokenizar("O Pássaro, cantou!  Vendê-la...")).toEqual(["o", "passaro", "cantou", "vende", "la"]);
  });
});

describe("alinhar", () => {
  it("leitura perfeita do texto inteiro em 30 s", () => {
    for (const t of TEXTOS) {
      const n = tokenizar(t.corpo).length;
      const r = alinhar(t.corpo, ler(t.corpo, 30000), t.idioma);
      expect(r.corretas).toBe(n);
      expect(r.erros).toBe(0);
      expect(r.lidas).toBe(n);
      expect(r.segundos).toBe(30);
      expect(r.pcpm).toBe(n * 2);
      expect(r.extras).toEqual([]);
      expect(r.itens.every((i) => i.marca === "correta")).toBe(true);
    }
  });

  it("para no meio: o resto fica não lido e não conta como erro", () => {
    const r = alinhar("a menina viu um gato preto no muro da casa", ler("a menina viu um gato preto", 20000), "pt");
    expect(marcas(r)).toEqual([...Array(6).fill("correta"), ...Array(4).fill("nao_lida")]);
    expect(r.corretas).toBe(6);
    expect(r.erros).toBe(0);
    expect(r.lidas).toBe(6);
    expect(r.segundos).toBe(20);
    expect(r.pcpm).toBe(18);
  });

  it("palavra trocada guarda o que foi dito", () => {
    const r = alinhar("o gato subiu no muro", ler("o gato sobe no muro", 10000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "trocada", "correta", "correta"]);
    expect(r.itens[2].dito).toBe("sobe");
    expect(r.itens[2].inicio).toBe(4000);
    expect(r.itens[2].fim).toBe(6000);
    expect(r.corretas).toBe(4);
    expect(r.erros).toBe(1);
    expect(r.lidas).toBe(5);
    expect(r.pcpm).toBe(24);
  });

  it("palavra pulada no meio", () => {
    const r = alinhar("o gato subiu no muro alto", ler("o gato no muro alto", 10000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "pulada", "correta", "correta", "correta"]);
    expect(r.itens[2].dito).toBeUndefined();
    expect(r.corretas).toBe(5);
    expect(r.erros).toBe(1);
    expect(r.lidas).toBe(6);
    expect(r.pcpm).toBe(30);
  });

  it("repetição não é erro", () => {
    const r = alinhar("o menino correu para casa", ler("o menino menino correu", 8000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta", "nao_lida", "nao_lida"]);
    expect(r.itens[1].inicio).toBe(2000);
    expect(r.extras).toEqual([{ texto: "menino", inicio: 4000, fim: 6000, tipo: "repeticao" }]);
    expect(r.corretas).toBe(3);
    expect(r.erros).toBe(0);
    expect(r.lidas).toBe(3);
    expect(r.segundos).toBe(8);
    expect(r.pcpm).toBe(23);
  });

  it("autocorreção conta como correta", () => {
    const r = alinhar("o gato caça o rato", ler("o gato casa... caça o rato", 12000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "autocorrecao", "correta", "correta"]);
    expect(r.itens[2].dito).toBe("casa...");
    expect(r.itens[2].inicio).toBe(4000);
    expect(r.itens[2].fim).toBe(8000);
    expect(r.extras).toEqual([]);
    expect(r.corretas).toBe(5);
    expect(r.erros).toBe(0);
    expect(r.lidas).toBe(5);
    expect(r.pcpm).toBe(25);
  });

  it("hesitação é removida e pausa longa marca hesitação", () => {
    const palavras: PalavraLida[] = [
      { texto: "O", inicio: 0, fim: 400 },
      { texto: "gato", inicio: 500, fim: 1000 },
      { texto: "é", inicio: 2000, fim: 2300 },
      { texto: "caça", inicio: 4500, fim: 5000 },
      { texto: "o", inicio: 5100, fim: 5300 },
      { texto: "rato.", inicio: 5400, fim: 6000 },
    ];
    const r = alinhar("O gato caça o rato.", palavras, "pt");
    expect(marcas(r)).toEqual(Array(5).fill("correta"));
    expect(r.itens.map((i) => i.hesitacao)).toEqual([false, false, true, false, false]);
    expect(r.extras).toEqual([]);
    expect(r.corretas).toBe(5);
    expect(r.segundos).toBe(6);
    expect(r.pcpm).toBe(50);
  });

  it("palavras que começam depois de 60000 ms são ignoradas", () => {
    const palavras: PalavraLida[] = [
      ..."um dois tres quatro cinco seis".split(" ").map((texto, k) => ({ texto, inicio: k * 1000, fim: k * 1000 + 500 })),
      { texto: "sete", inicio: 59500, fim: 60400 },
      { texto: "oito", inicio: 60000, fim: 60400 },
      { texto: "nove", inicio: 61000, fim: 61500 },
    ];
    const r = alinhar("um dois tres quatro cinco seis sete oito nove dez", palavras, "pt");
    expect(marcas(r)).toEqual([...Array(7).fill("correta"), ...Array(3).fill("nao_lida")]);
    expect(r.corretas).toBe(7);
    expect(r.segundos).toBe(60);
    expect(r.pcpm).toBe(7);
  });

  it("acentos, pontuação e maiúsculas não importam", () => {
    const r = alinhar("O Pássaro, cantou!", ler("o passaro Cantou", 3000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta"]);
    expect(r.pcpm).toBe(60);
  });

  it("transcrição vazia", () => {
    const r = alinhar("o gato subiu no muro", [], "pt");
    expect(marcas(r)).toEqual(Array(5).fill("nao_lida"));
    expect(r.extras).toEqual([]);
    expect(r.corretas).toBe(0);
    expect(r.erros).toBe(0);
    expect(r.lidas).toBe(0);
    expect(r.segundos).toBe(1);
    expect(r.pcpm).toBe(0);
  });
});

describe("alinhar, casos extras", () => {
  it("o verbo é não é tratado como hesitação", () => {
    const r = alinhar("o gato é preto", ler("o gato é preto", 4000), "pt");
    expect(marcas(r)).toEqual(Array(4).fill("correta"));
    expect(r.corretas).toBe(4);
  });

  it("hesitações em inglês são removidas", () => {
    const r = alinhar("the dog ran home", ler("the um dog uh ran home", 6000), "en");
    expect(marcas(r)).toEqual(Array(4).fill("correta"));
    expect(r.extras).toEqual([]);
    expect(r.corretas).toBe(4);
  });

  it("só hesitações dá zero", () => {
    const r = alinhar("the dog ran home", ler("um uh hmm", 3000), "en");
    expect(marcas(r)).toEqual(Array(4).fill("nao_lida"));
    expect(r.corretas).toBe(0);
    expect(r.pcpm).toBe(0);
  });

  it("palavra inserida aparece como inserção e não é erro", () => {
    const r = alinhar("o gato subiu no muro", ler("o gato grande subiu no muro", 6000), "pt");
    expect(marcas(r)).toEqual(Array(5).fill("correta"));
    expect(r.extras).toEqual([{ texto: "grande", inicio: 2000, fim: 3000, tipo: "insercao" }]);
    expect(r.erros).toBe(0);
    expect(r.pcpm).toBe(50);
  });

  it("repetição de um trecho inteiro não é erro", () => {
    const r = alinhar("o menino correu para casa", ler("o menino correu o menino correu para casa", 8000), "pt");
    expect(marcas(r)).toEqual(Array(5).fill("correta"));
    expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([
      ["o", "repeticao"],
      ["menino", "repeticao"],
      ["correu", "repeticao"],
    ]);
    expect(r.erros).toBe(0);
  });

  it("pular uma linha inteira marca as palavras como puladas em vez de trocar tudo", () => {
    const corpo = Array.from({ length: 30 }, (_, k) => `p${String.fromCharCode(97 + (k % 26))}${k >= 26 ? "z" : ""}`).join(" ");
    const tokens = tokenizar(corpo);
    const fala = [...tokens.slice(0, 10), ...tokens.slice(22, 27)].join(" ");
    const r = alinhar(corpo, ler(fala, 15000), "pt");
    expect(marcas(r)).toEqual([
      ...Array(10).fill("correta"),
      ...Array(12).fill("pulada"),
      ...Array(5).fill("correta"),
      ...Array(3).fill("nao_lida"),
    ]);
    expect(r.corretas).toBe(15);
    expect(r.erros).toBe(12);
    expect(r.pcpm).toBe(60);
  });

  it("começar numa frase adiante marca o começo como pulado", () => {
    const corpo = "a menina acordou cedo e abriu a janela do quarto para ver o sol. Depois tomou café com o pai.";
    const r = alinhar(corpo, ler("depois tomou café com o pai", 6000), "pt");
    expect(marcas(r)).toEqual([...Array(14).fill("pulada"), ...Array(6).fill("correta")]);
    expect(r.corretas).toBe(6);
    expect(r.erros).toBe(14);
  });

  it("texto muito curto com fala a mais", () => {
    const r = alinhar("Sol.", ler("o sol brilha", 3000), "pt");
    expect(marcas(r)).toEqual(["correta"]);
    expect(r.itens[0].inicio).toBe(1000);
    expect(r.extras.map((e) => e.tipo)).toEqual(["insercao", "insercao"]);
    expect(r.corretas).toBe(1);
    expect(r.erros).toBe(0);
    expect(r.segundos).toBe(2);
    expect(r.pcpm).toBe(30);
  });

  it("várias tentativas antes de acertar viram uma autocorreção", () => {
    const r = alinhar("o gato caça o rato", ler("o gato ca ca caça o rato", 7000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "autocorrecao", "correta", "correta"]);
    expect(r.itens[2].dito).toBe("ca ca");
    expect(r.itens[2].inicio).toBe(2000);
    expect(r.extras).toEqual([]);
    expect(r.pcpm).toBe(43);
  });

  it("várias palavras erradas seguidas continuam trocadas, não puladas", () => {
    const r = alinhar("o gato subiu no muro alto", ler("o gato sobe na mura alto", 6000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "trocada", "trocada", "trocada", "correta"]);
    expect(r.itens.slice(2, 5).map((i) => i.dito)).toEqual(["sobe", "na", "mura"]);
    expect(r.extras).toEqual([]);
    expect(r.erros).toBe(3);
  });

  it("palavra com hífen lida separada", () => {
    const r = alinhar("pegou o guarda-chuva", ler("pegou o guarda chuva", 4000), "pt");
    expect(marcas(r)).toEqual(Array(4).fill("correta"));
  });

  it("última palavra errada antes de parar conta como trocada", () => {
    const r = alinhar("o gato subiu no muro", ler("o gato sumiu", 3000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "trocada", "nao_lida", "nao_lida"]);
    expect(r.itens[2].dito).toBe("sumiu");
    expect(r.erros).toBe(1);
  });
});

describe("alinhar, como um avaliador humano", () => {
  it("pular uma palavra no fim da leitura é pulada, não troca", () => {
    const r = alinhar("a menina viu um gato preto", ler("a menina viu gato", 4000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta", "pulada", "correta", "nao_lida"]);
    expect(r.corretas).toBe(4);
    expect(r.erros).toBe(1);
  });

  it("repetir a última palavra ao parar é repetição, não erro", () => {
    const r = alinhar("a menina viu um gato preto", ler("a menina viu viu", 4000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta", "nao_lida", "nao_lida", "nao_lida"]);
    expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([["viu", "repeticao"]]);
    expect(r.erros).toBe(0);
    expect(r.segundos).toBe(3);
  });

  it("uma ou duas palavras coincidentes não fazem a leitura saltar adiante", () => {
    const r = alinhar("o menino viu o caso de a casa pegar fogo", ler("o menino viu a casa", 5000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta", "trocada", "trocada", ...Array(5).fill("nao_lida")]);
    expect(r.itens.slice(3, 5).map((i) => i.dito)).toEqual(["a", "casa"]);
    expect(r.corretas).toBe(3);
    expect(r.erros).toBe(2);
  });

  it("o tempo termina na última palavra do texto, não em falas depois dela", () => {
    const r = alinhar("o gato subiu no muro", ler("o gato subiu no muro pronto acabei", 7000), "pt");
    expect(r.extras.map((e) => e.tipo)).toEqual(["insercao", "insercao"]);
    expect(r.segundos).toBe(5);
    expect(r.pcpm).toBe(60);
  });

  it("o cronômetro começa na primeira palavra lida", () => {
    const palavras = ler("o gato subiu no muro", 15000, 5000);
    const r = alinhar("o gato subiu no muro", palavras, "pt");
    expect(r.itens.map((i) => i.hesitacao)).toEqual(Array(5).fill(false));
    expect(r.segundos).toBe(10);
    expect(r.pcpm).toBe(30);
  });

  it("o corte de 60 s conta a partir da primeira palavra", () => {
    const palavras: PalavraLida[] = [
      { texto: "um", inicio: 4000, fim: 4500 },
      { texto: "dois", inicio: 30000, fim: 30500 },
      { texto: "tres", inicio: 63500, fim: 64000 },
      { texto: "quatro", inicio: 64000, fim: 64500 },
    ];
    const r = alinhar("um dois tres quatro cinco", palavras, "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta", "nao_lida", "nao_lida"]);
    expect(r.segundos).toBe(60);
    expect(r.pcpm).toBe(3);
  });

  it("variantes da fala contam como corretas", () => {
    const r = alinhar("Ele está indo para casa com você.", ler("ele tá indo pra casa com cê", 7000), "pt");
    expect(marcas(r)).toEqual(Array(7).fill("correta"));
    expect(r.erros).toBe(0);
  });

  it("pro vale por para o", () => {
    const r = alinhar("voltou para o quarto", ler("voltou pro quarto", 3000), "pt");
    expect(marcas(r)).toEqual(Array(4).fill("correta"));
    expect(r.itens[1].inicio).toBe(1000);
    expect(r.itens[2].inicio).toBe(1000);
    expect(r.corretas).toBe(4);
    expect(r.pcpm).toBe(80);
  });

  it("algarismos valem pelas palavras de número", () => {
    const pt = alinhar("os dois meninos viram três gatos e uma vaca", ler("os 2 meninos viram 3 gatos e 1 vaca", 9000), "pt");
    expect(pt.corretas).toBe(9);
    const en = alinhar("One afternoon she saw seven birds", ler("1 afternoon she saw 7 birds", 6000), "en");
    expect(en.corretas).toBe(6);
  });

  it("grafias diferentes dos nomes dos textos contam como corretas", () => {
    expect(alinhar("Mateus levantou a mão", ler("Matheus levantou a mão", 4000), "pt").corretas).toBe(4);
    expect(alinhar("Maya's grandmother lived", ler("Maia's grandmother lived", 3000), "en").corretas).toBe(3);
  });

  it("palavra dividida em duas pelo reconhecedor conta como uma", () => {
    const r = alinhar("tall sunflowers grew", ler("tall sun flowers grew", 4000), "en");
    expect(marcas(r)).toEqual(Array(3).fill("correta"));
    expect(r.itens[1].inicio).toBe(1000);
    expect(r.itens[1].fim).toBe(3000);
    expect(r.extras).toEqual([]);
  });

  it("duas palavras juntadas pelo reconhecedor contam como duas", () => {
    const r = alinhar("he saw every one of them", ler("he saw everyone of them", 5000), "en");
    expect(marcas(r)).toEqual(Array(6).fill("correta"));
    expect(r.corretas).toBe(6);
  });

  it("variações de hesitação são removidas", () => {
    expect(alinhar("the dog ran home", ler("the umm dog mhm ran uhm home", 7000), "en").extras).toEqual([]);
    const pt = alinhar("o gato é preto", ler("o ãh gato né é... preto", 6000), "pt");
    expect(marcas(pt)).toEqual(Array(4).fill("correta"));
    expect(pt.extras).toEqual([]);
  });
});

describe("textos", () => {
  it("têm tamanho do ano e nenhum algarismo", () => {
    const faixa: Record<string, [number, number]> = { "pt-1": [50, 70], "pt-2": [80, 100], "pt-3": [110, 135], "pt-4": [140, 165], "en-2": [80, 105], "en-4": [140, 165] };
    expect(TEXTOS).toHaveLength(6);
    for (const t of TEXTOS) {
      const [min, max] = faixa[`${t.idioma}-${t.ano}`];
      const n = tokenizar(t.corpo).length;
      expect(n).toBeGreaterThanOrEqual(min);
      expect(n).toBeLessThanOrEqual(max);
      expect(t.corpo).not.toMatch(/\d/);
    }
    expect(new Set(TEXTOS.map((t) => t.id)).size).toBe(6);
  });
});
