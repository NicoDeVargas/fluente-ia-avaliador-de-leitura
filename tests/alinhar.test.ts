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
    expect(r.segundos).toBe(1);
    expect(r.pcpm).toBe(60);
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

describe("alinhar, relógio e saltos", () => {
  const corpoDe = (id: string) => TEXTOS.find((t) => t.id === id)!.corpo;

  it("título lido em voz alta não conta no tempo", () => {
    const corpo = corpoDe("bola-azul");
    const texto = tokenizar(corpo).slice(0, 10).join(" ");
    const palavras = [...ler("A bola azul", 1500), ...ler(texto, 8500, 3500)];
    const r = alinhar(corpo, palavras, "pt");
    expect(r.extras.map((e) => e.tipo)).toEqual(["insercao", "insercao", "insercao"]);
    expect(r.corretas).toBe(10);
    expect(r.itens[0].inicio).toBe(3500);
    expect(r.itens[0].hesitacao).toBe(false);
    expect(r.segundos).toBe(5);
    expect(r.pcpm).toBe(120);
  });

  it("vou começar antes do texto não marca hesitação nem muda o PCPM", () => {
    const corpo = "o gato subiu no muro";
    const texto = ler(corpo, 9500, 4500);
    const com = alinhar(corpo, [...ler("vou começar", 1000), ...texto], "pt");
    const sem = alinhar(corpo, texto, "pt");
    expect(com.itens.map((i) => i.hesitacao)).toEqual(Array(5).fill(false));
    expect(com.segundos).toBe(5);
    expect(com.pcpm).toBe(60);
    expect(com.pcpm).toBe(sem.pcpm);
    expect(com.corretas).toBe(sem.corretas);
  });

  it("o corte de 60 s conta a partir da primeira palavra do texto", () => {
    const palavras: PalavraLida[] = [
      { texto: "vou", inicio: 0, fim: 300 },
      { texto: "começar", inicio: 300, fim: 800 },
      { texto: "um", inicio: 5000, fim: 5500 },
      { texto: "dois", inicio: 30000, fim: 30500 },
      { texto: "tres", inicio: 64500, fim: 65000 },
      { texto: "quatro", inicio: 65000, fim: 65500 },
    ];
    const r = alinhar("um dois tres quatro cinco", palavras, "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta", "nao_lida", "nao_lida"]);
    expect(r.segundos).toBe(60);
  });

  function lerComSalto(fala: string[]) {
    const corpo = corpoDe("faltou-luz");
    const tokens = tokenizar(corpo);
    const inicio = tokens.indexOf("seu");
    const fim = tokens.indexOf("trovoes");
    return { corpo, inicio, fim, palavras: ler([...tokens.slice(0, inicio), ...fala, ...tokens.slice(fim + 3, fim + 8)].join(" "), 30000) };
  }

  it("repetição logo depois de pular um trecho não desfaz o salto", () => {
    const { corpo, inicio, fim, palavras } = lerComSalto(["clara", "lembrou", "lembrou"]);
    const r = alinhar(corpo, palavras, "pt");
    const m = marcas(r);
    expect(m.slice(0, inicio).every((x) => x === "correta")).toBe(true);
    expect(m.slice(inicio, fim + 1)).toEqual(Array(fim + 1 - inicio).fill("pulada"));
    expect(m.slice(fim + 1, fim + 8)).toEqual(Array(7).fill("correta"));
    expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([["lembrou", "repeticao"]]);
    expect(r.erros).toBe(12);
  });

  it("autocorreção logo depois de pular um trecho não desfaz o salto", () => {
    const { corpo, inicio, fim, palavras } = lerComSalto(["clara", "lem", "lembrou"]);
    const r = alinhar(corpo, palavras, "pt");
    expect(marcas(r).slice(inicio, fim + 1)).toEqual(Array(12).fill("pulada"));
    expect(r.itens[fim + 1].marca).toBe("correta");
    expect(r.itens[fim + 2].marca).toBe("autocorrecao");
    expect(r.itens[fim + 2].dito).toBe("lem");
    expect(r.extras).toEqual([]);
    expect(r.erros).toBe(12);
  });

  it("pular uma frase e parar logo depois ainda é salto", () => {
    const corpo = corpoDe("horta-da-escola");
    const tokens = tokenizar(corpo);
    const quem = tokens.indexOf("quem");
    const r = alinhar(corpo, ler([...tokens.slice(0, quem), "a", "professora"].join(" "), 20000), "pt");
    const m = marcas(r);
    expect(m.slice(quem, quem + 5)).toEqual(Array(5).fill("pulada"));
    expect(m.slice(quem + 5, quem + 7)).toEqual(["correta", "correta"]);
    expect(m.slice(quem + 7).every((x) => x === "nao_lida")).toBe(true);
    expect(r.corretas).toBe(quem + 2);
    expect(r.erros).toBe(5);
  });

  it("gagueira na primeira palavra depois do salto mantém o salto", () => {
    const a = lerComSalto(["cla", "clara", "lembrou"]);
    const r = alinhar(a.corpo, a.palavras, "pt");
    expect(marcas(r).slice(a.inicio, a.fim + 1)).toEqual(Array(12).fill("pulada"));
    expect(r.itens[a.fim + 1].marca).toBe("autocorrecao");
    expect(r.itens[a.fim + 1].dito).toBe("cla");
    expect(r.itens[a.fim + 2].marca).toBe("correta");
    expect(r.extras).toEqual([]);
    const b = lerComSalto(["clara", "clara", "lembrou"]);
    const q = alinhar(b.corpo, b.palavras, "pt");
    expect(marcas(q).slice(b.inicio, b.fim + 1)).toEqual(Array(12).fill("pulada"));
    expect(q.itens[b.fim + 1].marca).toBe("correta");
    expect(q.extras.map((e) => [e.texto, e.tipo])).toEqual([["clara", "repeticao"]]);
    expect(q.erros).toBe(12);
  });

  it("fala antes do texto fica como inserção e a primeira palavra trocada é do texto", () => {
    const corpo = corpoDe("bola-azul");
    const resto = tokenizar(corpo).slice(1, 10).join(" ");
    const r = alinhar(corpo, [...ler("pronto", 500), ...ler(`Lua ${resto}`, 10000, 5000)], "pt");
    expect(r.extras).toEqual([{ texto: "pronto", inicio: 0, fim: 500, tipo: "insercao" }]);
    expect(r.itens[0].marca).toBe("trocada");
    expect(r.itens[0].dito).toBe("Lua");
    expect(r.itens[0].inicio).toBe(5000);
    expect(r.itens[0].hesitacao).toBe(false);
    expect(r.corretas).toBe(9);
    expect(r.erros).toBe(1);
    expect(r.segundos).toBe(5);
    expect(r.pcpm).toBe(108);
  });

  it("fala antes do texto com a primeira palavra pulada", () => {
    const corpo = corpoDe("bola-azul");
    const resto = tokenizar(corpo).slice(1, 10).join(" ");
    const r = alinhar(corpo, [...ler("pronto", 500), ...ler(resto, 9500, 5000)], "pt");
    expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([["pronto", "insercao"]]);
    expect(r.itens[0].marca).toBe("pulada");
    expect(r.itens.slice(1, 10).every((i) => i.marca === "correta" && i.hesitacao === false)).toBe(true);
    expect(r.corretas).toBe(9);
    expect(r.erros).toBe(1);
    expect(r.segundos).toBe(4.5);
    expect(r.pcpm).toBe(120);
  });

  it("okay antes da leitura não muda o PCPM", () => {
    const corpo = corpoDe("lost-kite");
    const texto = ler(tokenizar(corpo).slice(1, 11).join(" "), 8000, 3000);
    const com = alinhar(corpo, [...ler("okay", 400), ...texto], "en");
    const sem = alinhar(corpo, texto, "en");
    expect(com.extras.map((e) => [e.texto, e.tipo])).toEqual([["okay", "insercao"]]);
    expect(marcas(com)).toEqual(marcas(sem));
    expect(com.segundos).toBe(sem.segundos);
    expect(com.pcpm).toBe(sem.pcpm);
    expect(com.pcpm).toBe(120);
  });

  it("preâmbulo que cita a primeira palavra: o relógio começa na leitura de verdade", () => {
    const corpo = corpoDe("bola-azul");
    const texto = tokenizar(corpo).slice(0, 10).join(" ");
    const r = alinhar(corpo, [...ler("vou ler a da Lia", 2500), ...ler(texto, 10000, 5000)], "pt");
    expect(r.itens[0].marca).toBe("correta");
    expect(r.itens[0].inicio).toBe(5000);
    expect(r.corretas).toBe(10);
    expect(r.erros).toBe(0);
    expect(r.segundos).toBe(5);
    expect(r.pcpm).toBe(120);
  });

  it("fala depois da última palavra lida é inserção, não troca da próxima", () => {
    const corpo = corpoDe("horta-da-escola");
    const tokens = tokenizar(corpo);
    const estava = tokens.indexOf("estava");
    const r = alinhar(corpo, ler([...tokens.slice(0, estava + 1), "pronto"].join(" "), 15000), "pt");
    expect(r.itens[estava + 1].marca).toBe("nao_lida");
    expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([["pronto", "insercao"]]);
    expect(r.erros).toBe(0);
    expect(r.corretas).toBe(estava + 1);
  });

  it("palavras parecidas no fim da leitura são trocadas", () => {
    const r = alinhar("o menino viu a casa", ler("o menino viu o caso", 5000), "pt");
    expect(marcas(r)).toEqual(["correta", "correta", "correta", "trocada", "trocada"]);
    expect(r.itens.slice(3).map((i) => i.dito)).toEqual(["o", "caso"]);
    expect(r.corretas).toBe(3);
    expect(r.erros).toBe(2);
  });

  it("b, d, p e q trocadas contam como tentativa da mesma palavra", () => {
    const r = alinhar("o dado caiu", ler("o bado dado caiu", 4000), "pt");
    expect(marcas(r)).toEqual(["correta", "autocorrecao", "correta"]);
    expect(r.itens[1].dito).toBe("bado");
    expect(r.extras).toEqual([]);
  });

  it("chutes seguidos depois da última palavra certa são trocas e contam no tempo", () => {
    const corpo = corpoDe("bola-azul");
    const r = alinhar(corpo, ler("Lia tem uma bola azul. Mas gato cai em pé sim", 11000), "pt");
    expect(marcas(r).slice(0, 12)).toEqual([...Array(5).fill("correta"), ...Array(6).fill("trocada"), "nao_lida"]);
    expect(r.itens.slice(5, 11).map((i) => i.dito)).toEqual(["Mas", "gato", "cai", "em", "pé", "sim"]);
    expect(r.extras).toEqual([]);
    expect(r.corretas).toBe(5);
    expect(r.erros).toBe(6);
    expect(r.segundos).toBe(11);
    expect(r.pcpm).toBe(27);
  });

  it("fala depois de uma pausa no fim é conversa, antes dela são trocas", () => {
    const corpo = corpoDe("bola-azul");
    const conversa = alinhar(corpo, [...ler("Lia tem uma bola azul.", 5000), ...ler("Mas gato cai em pé sim", 12500, 6500)], "pt");
    expect(conversa.extras.map((e) => e.tipo)).toEqual(Array(6).fill("insercao"));
    expect(conversa.erros).toBe(0);
    expect(conversa.segundos).toBe(5);
    const misto = alinhar(corpo, [...ler("Lia tem uma bola azul. Mas gato cai", 8000), ...ler("pronto", 10000, 9500)], "pt");
    expect(marcas(misto).slice(5, 9)).toEqual(["trocada", "trocada", "trocada", "nao_lida"]);
    expect(misto.extras.map((e) => [e.texto, e.tipo])).toEqual([["pronto", "insercao"]]);
    expect(misto.segundos).toBe(8);
  });

  it("chutes no começo sem pausa são trocas das primeiras palavras", () => {
    const corpo = corpoDe("bola-azul");
    const r = alinhar(corpo, ler("Ana vai com bola azul. A bola pula no chão", 10000), "pt");
    expect(marcas(r).slice(0, 10)).toEqual([...Array(3).fill("trocada"), ...Array(7).fill("correta")]);
    expect(r.itens.slice(0, 3).map((i) => i.dito)).toEqual(["Ana", "vai", "com"]);
    expect(r.itens[0].inicio).toBe(0);
    expect(r.extras).toEqual([]);
    expect(r.corretas).toBe(7);
    expect(r.erros).toBe(3);
    expect(r.segundos).toBe(10);
    expect(r.pcpm).toBe(42);
  });

  it("fala no começo seguida de pausa é conversa", () => {
    const corpo = corpoDe("bola-azul");
    const r = alinhar(corpo, [...ler("Ana vai com", 1500), ...ler("bola azul. A bola pula no chão", 10000, 3000)], "pt");
    expect(marcas(r).slice(0, 3)).toEqual(Array(3).fill("pulada"));
    expect(r.extras.map((e) => e.tipo)).toEqual(Array(3).fill("insercao"));
    expect(r.itens[3].inicio).toBe(3000);
    expect(r.segundos).toBe(7);
    expect(r.pcpm).toBe(60);
  });

  it("tentativa longe da palavra ou curta com outra inicial não é autocorreção", () => {
    const corpo = corpoDe("horta-da-escola");
    const r = alinhar(corpo, [...ler("tá", 500), ...ler("Na escola de Davi tem uma horta", 10000, 3500)], "pt");
    expect(r.itens[0].marca).toBe("correta");
    expect(r.itens[0].inicio).toBe(3500);
    expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([["tá", "insercao"]]);
    expect(r.segundos).toBe(6.5);
    const junto = alinhar(corpo, ler("tá Na escola de Davi", 5000), "pt");
    expect(junto.itens[0].marca).toBe("correta");
    expect(junto.itens[0].inicio).toBe(1000);
    const longe = alinhar("o gato caça o rato", [...ler("o gato casa", 3000), ...ler("caça o rato", 8000, 5000)], "pt");
    expect(longe.itens[2].marca).toBe("correta");
    expect(longe.extras.map((e) => [e.texto, e.tipo])).toEqual([["casa", "insercao"]]);
  });

  it("primeira palavra repetida depois de uma conversa: o relógio começa na primeira", () => {
    const corpo = corpoDe("bola-azul");
    const r = alinhar(corpo, [...ler("pronto", 500), ...ler("Lia Lia tem uma bola azul.", 8000, 5000)], "pt");
    expect(r.itens[0].marca).toBe("correta");
    expect(r.itens[0].inicio).toBe(5000);
    expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([["pronto", "insercao"], ["Lia", "repeticao"]]);
    expect(r.segundos).toBe(3);
  });

  describe("conversa no fim", () => {
    const bola = () => corpoDe("bola-azul");
    const dez = "Lia tem uma bola azul. A bola pula no chão";

    it("trecho curto antes da pausa é conversa", () => {
      const a = alinhar(bola(), [...ler(`${dez} pronto acabei`, 12000), ...ler("tia", 15000, 14000)], "pt");
      expect(a.erros).toBe(0);
      expect(a.segundos).toBe(10);
      const b = alinhar(bola(), [...ler(`${dez} pronto`, 11000), ...ler("posso ir tia", 16000, 13000)], "pt");
      expect(b.erros).toBe(0);
      expect(b.extras).toHaveLength(4);
    });

    it("palavras de fechamento são conversa", () => {
      const consigo = alinhar(bola(), [...ler(dez, 10000), ...ler("não consigo mais", 13900, 10900)], "pt");
      expect(consigo.erros).toBe(0);
      expect(consigo.segundos).toBe(10);
      const sei = alinhar(bola(), [...ler("Lia tem uma bola azul.", 5000), ...ler("eu não sei ler", 10000, 6000)], "pt");
      expect(sei.erros).toBe(0);
      const adulto = alinhar(bola(), [...ler(dez, 6000), ...ler("muito bem pode parar", 8400, 6000)], "pt");
      expect(adulto.erros).toBe(0);
      expect(adulto.segundos).toBe(6);
      const kite = corpoDe("lost-kite");
      const pronto = alinhar(kite, [...ler(tokenizar(kite).slice(0, 10).join(" "), 1500), ...ler("okay I'm done", 2600, 2150)], "en");
      expect(pronto.erros).toBe(0);
      expect(pronto.segundos).toBe(1.5);
    });

    it("pausa grande para o ritmo da criança é conversa", () => {
      const r = alinhar(bola(), [...ler(dez, 3000), ...ler("Mas gato cai em pé sim", 5800, 4000)], "pt");
      expect(r.erros).toBe(0);
      expect(r.extras).toHaveLength(6);
      expect(r.segundos).toBe(3);
    });

    it("leitor lento com pausa pequena continua com trocas", () => {
      const r = alinhar(bola(), [...ler("Lia tem uma bola azul.", 3500), ...ler("Mas gato cai em", 6600, 3800)], "pt");
      expect(marcas(r).slice(5, 10)).toEqual(["trocada", "trocada", "trocada", "trocada", "nao_lida"]);
      expect(r.erros).toBe(4);
    });

    it("repetição no meio dos chutes não quebra o trecho", () => {
      const r = alinhar(bola(), ler("Lia tem uma bola azul. Mas azul gato cai", 9000), "pt");
      expect(marcas(r).slice(5, 9)).toEqual(["trocada", "trocada", "trocada", "nao_lida"]);
      expect(r.itens.slice(5, 8).map((i) => i.dito)).toEqual(["Mas", "gato", "cai"]);
      expect(r.extras.map((e) => [e.texto, e.tipo])).toEqual([["azul", "repeticao"]]);
      expect(r.erros).toBe(3);
    });
  });

  it("alinha um texto longo rapidamente", () => {
    const corpo = corpoDe("quiet-garden");
    const tokens = tokenizar(corpo);
    const fala = [...tokens, ...tokens].map((t, k) => (k % 7 === 3 ? "blue" : t)).join(" ");
    const palavras = ler(fala, 59000);
    for (let k = 0; k < 20; k++) alinhar(corpo, palavras, "en");
    const inicio = performance.now();
    for (let k = 0; k < 10; k++) alinhar(corpo, palavras, "en");
    const ms = (performance.now() - inicio) / 10;
    console.log(`alinhar ${tokens.length}x${palavras.length}: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(30);
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
