export interface PalavraLida { texto: string; inicio: number; fim: number }
export type Marca = "correta" | "trocada" | "pulada" | "autocorrecao" | "nao_lida";
export interface ItemTexto { indice: number; esperada: string; marca: Marca; dito?: string; inicio?: number; fim?: number; hesitacao?: boolean }
export interface Extra { texto: string; inicio: number; fim: number; tipo: "repeticao" | "insercao" }
export interface Resultado { itens: ItemTexto[]; extras: Extra[]; corretas: number; erros: number; lidas: number; segundos: number; pcpm: number }
type Idioma = "pt" | "en";

const HESITACOES: Record<Idioma, Set<string>> = {
  pt: new Set(["é", "hã", "ãh", "ahn", "hum", "hm", "hmm", "mm", "eh", "ah", "né"]),
  en: new Set(["um", "umm", "uhm", "uh", "er", "ah", "hmm", "hm", "mm", "mhm", "eh"]),
};
const NUMEROS: Record<Idioma, string[]> = {
  pt: ["zero", "um uma", "dois duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte"],
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"],
};
const VARIANTES: Record<Idioma, Record<string, string>> = {
  pt: { pra: "para", pro: "para", ta: "esta", to: "estou", ce: "voce", tava: "estava", matheus: "mateus", matteus: "mateus", david: "davi", davy: "davi" },
  en: { maia: "maya", maias: "mayas", sammy: "sam" },
};
const CONTRACOES: Record<Idioma, Record<string, string>> = {
  pt: { pro: "para o", pra: "para a", pros: "para os", pras: "para as" },
  en: {},
};
const EQUIVALENTES: Record<Idioma, Map<string, Set<string>>> = { pt: equivalentes("pt"), en: equivalentes("en") };
const JUNCOES: Record<Idioma, Map<string, string>> = { pt: juncoes("pt"), en: juncoes("en") };

const LIMITE_MS = 60000;
const PAUSA_MS = 3000;
const EDICAO = 1e9;
const PULO_SEGUINTE = 1e8;
const ACERTO = 1e4;
const REPETICAO = 1;
const ACERTOS_APOS_SALTO = 3;
const JANELA_REPETICAO = 3;

interface Token { texto: string; norm: string; inicio: number; fim: number; hesitacao: boolean; pausa: boolean }
type Tipo = "par" | "troca" | "extra" | "pulo";
interface Linha { igual: Uint8Array; tentativa: Uint8Array; juntaEsperados: Uint8Array; repete: Uint8Array }
interface Passo { tipo: Tipo; i: number; j: number; di: number; dj: number }

function equivalentes(idioma: Idioma) {
  const mapa = new Map<string, Set<string>>();
  const juntar = (lido: string, esperado: string) => mapa.set(lido, (mapa.get(lido) ?? new Set()).add(normalizar(esperado)));
  NUMEROS[idioma].forEach((palavras, n) => palavras.split(" ").forEach((p) => juntar(String(n), p)));
  Object.entries(VARIANTES[idioma]).forEach(([lido, esperado]) => juntar(lido, esperado));
  return mapa;
}

function juncoes(idioma: Idioma) {
  return new Map(Object.entries(CONTRACOES[idioma]).map(([lido, esperado]) => [lido, esperado.split(" ").map(normalizar).join("")]));
}

export function normalizar(p: string): string {
  return p.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");
}

function pedacos(corpo: string): string[] {
  return corpo
    .split(/\s+/)
    .flatMap((p) => p.split(/(?<=[-‐‑–—])/))
    .filter((p) => normalizar(p) !== "");
}

export function tokenizar(corpo: string): string[] {
  return pedacos(corpo).map(normalizar);
}

function ehHesitacao(p: string, idioma: Idioma) {
  return HESITACOES[idioma].has(p.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]/gu, ""));
}

function distancia(a: string, b: string) {
  let anterior = new Int32Array(b.length + 1);
  let atual = new Int32Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) anterior[j] = j;
  for (let i = 1; i <= a.length; i++) {
    atual[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const troca = anterior[j - 1] + (ca === b.charCodeAt(j - 1) ? 0 : 1);
      const lado = Math.min(anterior[j], atual[j - 1]) + 1;
      atual[j] = troca < lado ? troca : lado;
    }
    [anterior, atual] = [atual, anterior];
  }
  return anterior[b.length];
}

function parecida(tentativa: string, alvo: string) {
  if (tentativa === alvo) return false;
  if (alvo.startsWith(tentativa)) return true;
  const limite = Math.max(1, Math.floor(alvo.length / 3));
  return tentativa[0] === alvo[0] && Math.abs(tentativa.length - alvo.length) <= limite && distancia(tentativa, alvo) <= limite;
}

function naJanela(norm: string, j: number, esperados: string[]) {
  for (let k = Math.max(0, j - JANELA_REPETICAO); k <= Math.min(j, esperados.length - 1); k++) {
    if (esperados[k] === norm) return true;
  }
  return false;
}

function lerTokens(palavras: PalavraLida[], idioma: Idioma): Token[] {
  return palavras.flatMap((p) =>
    pedacos(p.texto).map((texto) => ({ texto, norm: normalizar(texto), inicio: p.inicio, fim: p.fim, hesitacao: ehHesitacao(texto, idioma), pausa: false })),
  );
}

const MOVIMENTOS: [Tipo, number, number][] = [["par", 1, 1], ["par", 2, 1], ["par", 1, 2], ["troca", 1, 1], ["extra", 1, 0], ["pulo", 0, 1]];

function caminho(lidos: Token[], originais: string[], esperados: string[], idioma: Idioma): Passo[] {
  const n = lidos.length;
  const m = esperados.length;
  const L = m + 1;
  const K = ACERTOS_APOS_SALTO;
  const estados = 2 + 2 * (K - 1);
  const primeiroFinal = 2 + (K - 1);
  const depois = Array.from({ length: estados }, (_, s) => (s < 2 || (s - 2) % (K - 1) === 0 ? 0 : s - 1));
  const equivalentes = EQUIVALENTES[idioma];
  const juncoes = JUNCOES[idioma];

  const pares = esperados.map((e, j) => (j + 1 < m ? e + esperados[j + 1] : ""));
  const posicoes = new Map<string, number[]>();
  esperados.forEach((e, j) => posicoes.set(e, [...(posicoes.get(e) ?? []), j]));
  const linhas = new Map<string, Linha>();
  const linhaDe = (a: string) => {
    const pronta = linhas.get(a);
    if (pronta) return pronta;
    const variantes = equivalentes.get(a);
    const contracao = juncoes.get(a);
    const linha: Linha = { igual: new Uint8Array(m), tentativa: new Uint8Array(m), juntaEsperados: new Uint8Array(m), repete: new Uint8Array(L) };
    for (let j = 0; j < m; j++) {
      const e = esperados[j];
      linha.igual[j] = a === e || !!variantes?.has(e) ? 1 : 0;
      linha.tentativa[j] = !linha.igual[j] && parecida(a, e) ? 1 : 0;
      linha.juntaEsperados[j] = pares[j] !== "" && (a === pares[j] || contracao === pares[j]) ? 1 : 0;
    }
    for (const j of posicoes.get(a) ?? []) {
      for (let k = j; k <= Math.min(m, j + JANELA_REPETICAO); k++) linha.repete[k] = 1;
    }
    linhas.set(a, linha);
    return linha;
  };
  const porLido = lidos.map((t) => linhaDe(t.norm));
  const juntaLidos = new Uint8Array(n * m);
  for (let i = 0; i + 1 < n; i++) {
    if (lidos[i + 1].hesitacao) continue;
    for (const j of posicoes.get(lidos[i].norm + lidos[i + 1].norm) ?? []) juntaLidos[i * m + j] = 1;
  }
  const inicioDeFrase = new Uint8Array(m);
  for (let j = 1; j < m; j++) inicioDeFrase[j] = /[.!?…]["”’)]*$/.test(originais[j - 1]) ? 1 : 0;

  const V = Array.from({ length: estados }, (_, s) => {
    const v = new Float64Array((n + 1) * L).fill(Infinity);
    if (s === 0 || s >= primeiroFinal) v.fill(0, n * L);
    return v;
  });
  const escolha = new Uint8Array(estados * n * L);
  const destino = new Uint8Array(estados * n * L);

  const tamanho = n * L;
  for (let i = n - 1; i >= 0; i--) {
    const hesitacao = lidos[i].hesitacao;
    const { igual, tentativa, juntaEsperados, repete } = porLido[i];
    for (let j = m; j >= 0; j--) {
      const c = i * m + j;
      const aqui = i * L + j;
      const diagonal = aqui + L + 1;
      const dentro = j < m;
      const casa = dentro && igual[j] === 1;
      const juntaL = dentro && juntaLidos[c] === 1;
      const juntaE = dentro && juntaEsperados[j] === 1;
      const repeticao = repete[j] === 1;
      const tenta = dentro && tentativa[j] === 1;
      const custoExtra = repeticao ? EDICAO - REPETICAO : EDICAO;
      const aposSalto = dentro && inicioDeFrase[j] ? estados - 1 : primeiroFinal - 1;
      for (let s = 0; s < estados; s++) {
        const extraPermitido = hesitacao || s === 0 || (s >= 2 && repeticao) || tenta;
        if (s >= 2 && !casa && !juntaL && !juntaE && !extraPermitido) {
          V[s][aqui] = Infinity;
          continue;
        }
        let melhor = Infinity;
        let mov = 0;
        let prox = 0;
        let v: number;
        const px = s === 1 ? aposSalto : depois[s];
        const Vp = V[px];
        if (casa && (v = -ACERTO + Vp[diagonal]) < melhor) { melhor = v; mov = 0; prox = px; }
        if (juntaL && (v = -ACERTO + Vp[diagonal + L]) < melhor) { melhor = v; mov = 1; prox = px; }
        if (juntaE && (v = -2 * ACERTO + Vp[diagonal + 1]) < melhor) { melhor = v; mov = 2; prox = px; }
        if (dentro && s === 0 && !casa && (v = EDICAO + V[0][diagonal]) < melhor) { melhor = v; mov = 3; prox = 0; }
        if (extraPermitido && (v = (hesitacao ? 0 : custoExtra) + V[s][aqui + L]) < melhor) { melhor = v; mov = 4; prox = s; }
        if (dentro && s === 0) {
          if ((v = EDICAO + V[0][aqui + 1]) < melhor) { melhor = v; mov = 5; prox = 0; }
          if ((v = EDICAO + V[1][aqui + 1]) < melhor) { melhor = v; mov = 5; prox = 1; }
        }
        if (dentro && s === 1 && (v = PULO_SEGUINTE + V[1][aqui + 1]) < melhor) { melhor = v; mov = 5; prox = 1; }
        V[s][aqui] = melhor;
        escolha[s * tamanho + aqui] = mov;
        destino[s * tamanho + aqui] = prox;
      }
    }
  }

  const passos: Passo[] = [];
  let i = 0;
  let j = 0;
  let s = 0;
  while (i < n) {
    const k = s * tamanho + i * L + j;
    const [tipo, di, dj] = MOVIMENTOS[escolha[k]];
    passos.push({ tipo, i, j, di, dj });
    s = destino[k];
    i += di;
    j += dj;
  }
  return passos;
}

function montar(lidos: Token[], originais: string[], esperados: string[], idioma: Idioma) {
  const passos = caminho(lidos, originais, esperados, idioma).filter((p) => !(p.tipo === "extra" && lidos[p.i].hesitacao));

  const falados = passos.flatMap((p) => (p.tipo === "pulo" ? [] : lidos.slice(p.i, p.i + p.di)));
  falados.forEach((t, k) => (t.pausa = k > 0 && t.inicio - falados[k - 1].fim > PAUSA_MS));

  const itens: ItemTexto[] = originais.map((esperada, indice) => ({ indice, esperada, marca: "nao_lida" }));
  const extras: Extra[] = [];
  const ultimoLido = passos.findLastIndex((p) => p.tipo === "par" || p.tipo === "troca");
  const absorvidos = new Set<number>();

  passos.forEach((p, k) => {
    if (p.tipo === "pulo") {
      if (k < ultimoLido) itens[p.j].marca = "pulada";
      return;
    }
    if (p.tipo === "extra") return;
    const primeiro = lidos[p.i];
    const ultimo = lidos[p.i + p.di - 1];
    for (let d = 0; d < p.dj; d++) {
      Object.assign(itens[p.j + d], { marca: p.tipo === "par" ? "correta" : "trocada", inicio: primeiro.inicio, fim: ultimo.fim, hesitacao: primeiro.pausa });
    }
    const item = itens[p.j];
    if (p.tipo === "troca") {
      item.dito = primeiro.texto;
      return;
    }
    const seguinte = passos[k + 1];
    if (p.di === 2 && seguinte?.tipo === "extra" && lidos[seguinte.i].norm === esperados[p.j]) {
      Object.assign(item, { marca: "autocorrecao", dito: `${primeiro.texto} ${ultimo.texto}`, fim: lidos[seguinte.i].fim });
      absorvidos.add(k + 1);
      return;
    }
    const tentativas: Token[] = [];
    for (let a = k - 1; a >= 0; a--) {
      const anterior = passos[a];
      if (anterior.tipo !== "extra" || naJanela(lidos[anterior.i].norm, anterior.j, esperados) || !parecida(lidos[anterior.i].norm, esperados[p.j])) break;
      tentativas.unshift(lidos[anterior.i]);
      absorvidos.add(a);
    }
    if (tentativas.length) {
      Object.assign(item, { marca: "autocorrecao", dito: tentativas.map((x) => x.texto).join(" "), inicio: tentativas[0].inicio, hesitacao: tentativas[0].pausa });
    }
  });

  passos.forEach((p, k) => {
    if (p.tipo !== "extra" || absorvidos.has(k)) return;
    const t = lidos[p.i];
    extras.push({ texto: t.texto, inicio: t.inicio, fim: t.fim, tipo: naJanela(t.norm, p.j, esperados) ? "repeticao" : "insercao" });
  });

  const alinhados = itens.filter((i) => i.inicio !== undefined);
  if (alinhados.length) alinhados[0].hesitacao = false;
  return { itens, extras, alinhados };
}

export function alinhar(corpo: string, palavras: PalavraLida[], idioma: Idioma): Resultado {
  const originais = pedacos(corpo);
  const esperados = originais.map(normalizar);
  const tokens = lerTokens(palavras, idioma);
  let r = montar(tokens, originais, esperados, idioma);
  if (r.alinhados.length) {
    const limite = r.alinhados[0].inicio! + LIMITE_MS;
    if (tokens.some((t) => t.inicio >= limite)) r = montar(tokens.filter((t) => t.inicio < limite), originais, esperados, idioma);
  }
  const { itens, extras, alinhados } = r;

  const conta = (...marcas: Marca[]) => itens.filter((i) => marcas.includes(i.marca)).length;
  const corretas = conta("correta", "autocorrecao");
  const erros = conta("trocada", "pulada");
  const segundos = alinhados.length
    ? Math.max(1, Math.min(60, Math.round(Math.max(...alinhados.map((i) => i.fim!)) - alinhados[0].inicio!) / 1000))
    : 1;
  return { itens, extras, corretas, erros, lidas: corretas + erros, segundos, pcpm: Math.round((corretas * 60) / segundos) };
}
