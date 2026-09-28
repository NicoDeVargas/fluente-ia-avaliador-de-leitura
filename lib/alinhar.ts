export interface PalavraLida { texto: string; inicio: number; fim: number }
export type Marca = "correta" | "trocada" | "pulada" | "autocorrecao" | "nao_lida";
export interface ItemTexto { indice: number; esperada: string; marca: Marca; dito?: string; inicio?: number; fim?: number; hesitacao?: boolean; silabada?: boolean }
export interface Extra { texto: string; inicio: number; fim: number; tipo: "repeticao" | "insercao" }
export interface Resultado { itens: ItemTexto[]; extras: Extra[]; corretas: number; erros: number; lidas: number; segundos: number; pcpm: number; silabadas: number }
import { contarSilabas } from "./silabas.ts";

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
const ENCLISE: Record<Idioma, Record<string, string>> = {
  pt: { lo: "ele", la: "ela", los: "eles", las: "elas" },
  en: {},
};
const EQUIVALENTES: Record<Idioma, Map<string, Set<string>>> = { pt: equivalentes("pt"), en: equivalentes("en") };
const JUNCOES: Record<Idioma, Map<string, string>> = { pt: juncoes("pt"), en: juncoes("en") };

const LIMITE_MS = 60000;
const PAUSA_MS = 3000;
const PAUSA_CONVERSA_MS = 1500;
const CONVERSA_INICIO = 3;
const CONVERSA_FIM = 2;
const PAUSA_RELATIVA_MS = 700;
const RITMO_PAUSA = 3;
const FECHAMENTO: Record<Idioma, string[]> = {
  pt: ["pronto", "acabei", "terminei", "tia", "tio", "prof", "professora", "não consigo", "não sei", "posso", "parar", "cabou", "acabou"],
  en: ["done", "finished", "okay", "ok", "i'm", "im", "that's", "can't", "cannot", "teacher", "stop"],
};
const EDICAO = 1e9;
const PULO_SEGUINTE = 1e8;
const ACERTO = 1e4;
const REPETICAO = 1;
const TROCA_PARECIDA = 5;
const TROCA_DIFERENTE = 2;
const EXTRA_APOS_PRIMEIRA = 3;
const ACERTOS_APOS_SALTO = 3;
const JANELA_REPETICAO = 3;
const ESPELHADAS = "bdpq";
const MAX_PEDACOS = 6;
const HIFENS = /[-‐‑]/;
const SEPARA_TEXTO = /(?<=[–—])/;
const SEPARA_FALA = /(?<=[-‐‑–—])/;
export const MS_POR_SILABA_SILABADA = 300;

interface Token { texto: string; norm: string; inicio: number; fim: number; hesitacao: boolean; pausa: boolean; intervalo: number; salto: number }
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

function pedacos(corpo: string, separa = SEPARA_TEXTO): string[] {
  return corpo
    .split(/\s+/)
    .flatMap((p) => p.split(separa))
    .filter((p) => normalizar(p) !== "");
}

function partesDoHifen(original: string) {
  return original.split(HIFENS).map(normalizar).filter(Boolean);
}

function alternativas(original: string, idioma: Idioma) {
  const partes = partesDoHifen(original);
  const pronome = partes.length === 2 ? ENCLISE[idioma][partes[1]] : undefined;
  return pronome ? [partes[0] + "r" + pronome] : [];
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
  const curtas = tentativa.length <= 2 && alvo.length <= 2;
  return (curtas || mesmaInicial(tentativa, alvo)) && Math.abs(tentativa.length - alvo.length) <= limite && distancia(tentativa, alvo) <= limite;
}

function tentativaDe(tentativa: string, alvo: string) {
  return parecida(tentativa, alvo) && (tentativa.length > 2 || mesmaInicial(tentativa, alvo));
}

function fragmento(pedaco: string, alvo: string) {
  return pedaco.length >= 2 && pedaco.length < alvo.length && alvo.includes(pedaco);
}

function mesmaInicial(a: string, b: string) {
  return a[0] === b[0] || (ESPELHADAS.includes(a[0]) && ESPELHADAS.includes(b[0]));
}

function naJanela(norm: string, j: number, esperados: string[]) {
  for (let k = Math.max(0, j - JANELA_REPETICAO); k <= Math.min(j, esperados.length - 1); k++) {
    if (esperados[k] === norm) return true;
  }
  return false;
}

function lerTokens(palavras: PalavraLida[], idioma: Idioma): Token[] {
  return palavras.flatMap((p) =>
    pedacos(p.texto, SEPARA_FALA).map((texto) => ({ texto, norm: normalizar(texto), inicio: p.inicio, fim: p.fim, hesitacao: ehHesitacao(texto, idioma), pausa: false, intervalo: 0, salto: 0 })),
  );
}

const MOVIMENTOS: [Tipo, number, number][] = [
  ["par", 1, 1], ["par", 2, 1], ["par", 1, 2], ["troca", 1, 1], ["extra", 1, 0], ["pulo", 0, 1],
  ...Array.from({ length: MAX_PEDACOS - 2 }, (_, d): [Tipo, number, number] => ["par", d + 3, 1]),
];
const movimentoJunta = (k: number) => (k === 2 ? 1 : k + 3);

function caminho(lidos: Token[], originais: string[], esperados: string[], idioma: Idioma): Passo[] {
  const n = lidos.length;
  const m = esperados.length;
  const L = m + 1;
  const K = ACERTOS_APOS_SALTO;
  const P = 2 + 2 * (K - 1);
  const F = P + 1;
  const estados = P + 2;
  const primeiroFinal = 2 + (K - 1);
  const depois = Array.from({ length: estados }, (_, s) => (s === P ? F : s < 2 || s === F || (s - 2) % (K - 1) === 0 ? 0 : s - 1));
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
  const alvos = new Map<string, number[]>();
  originais.forEach((o, j) => [esperados[j], ...alternativas(o, idioma)].forEach((a) => alvos.set(a, [...(alvos.get(a) ?? []), j])));
  const juntaLidos = new Uint8Array(n * m);
  for (let i = 0; i < n; i++) {
    let junto = lidos[i].norm;
    for (let k = 2; k <= MAX_PEDACOS && i + k <= n; k++) {
      if (lidos[i + k - 1].hesitacao) break;
      junto += lidos[i + k - 1].norm;
      for (const j of alvos.get(junto) ?? []) juntaLidos[i * m + j] = k;
    }
  }
  const aposPausa = new Uint8Array(n);
  let fimAnterior = -Infinity;
  lidos.forEach((t, i) => {
    if (t.hesitacao) return;
    aposPausa[i] = t.inicio - fimAnterior >= PAUSA_CONVERSA_MS ? 1 : 0;
    fimAnterior = t.fim;
  });
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
      const juntaK = dentro ? juntaLidos[c] : 0;
      const juntaL = juntaK > 0;
      const juntaE = dentro && juntaEsperados[j] === 1;
      const repeticao = repete[j] === 1;
      const tenta = dentro && tentativa[j] === 1;
      const imediata = j > 0 && igual[j - 1] === 1;
      const custoExtra = repeticao ? EDICAO - REPETICAO : EDICAO;
      const aposSalto = dentro && inicioDeFrase[j] ? P - 1 : primeiroFinal - 1;
      const custoTroca = tenta ? EDICAO - TROCA_PARECIDA : EDICAO + TROCA_DIFERENTE;
      for (let s = 0; s < estados; s++) {
        const ehR = s >= 2 && s < P;
        const comoD = s === 0 || s === F;
        const livre = comoD || s === P;
        const seguinte = s === F ? 0 : s;
        const extraPermitido = hesitacao || livre || (ehR && repeticao) || tenta;
        if (ehR && !casa && !juntaL && !juntaE && !extraPermitido) {
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
        if (juntaL && (v = -ACERTO + Vp[diagonal + (juntaK - 1) * L]) < melhor) { melhor = v; mov = movimentoJunta(juntaK); prox = px; }
        if (juntaE && (v = -2 * ACERTO + Vp[diagonal + 1]) < melhor) { melhor = v; mov = 2; prox = px; }
        if (dentro && !casa && (comoD || (s === P && tenta)) && (v = custoTroca + Vp[diagonal]) < melhor) { melhor = v; mov = 3; prox = px; }
        const barato = s === 1 ? tenta : ehR && (tenta || imediata);
        const custo = hesitacao ? 0 : barato ? PULO_SEGUINTE : custoExtra + (s === F && aposPausa[i] ? EXTRA_APOS_PRIMEIRA : 0);
        const aposExtra = hesitacao ? s : seguinte;
        if (extraPermitido && (v = custo + V[aposExtra][aqui + L]) < melhor) { melhor = v; mov = 4; prox = aposExtra; }
        if (dentro && livre) {
          if ((v = EDICAO + V[seguinte][aqui + 1]) < melhor) { melhor = v; mov = 5; prox = seguinte; }
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
  let s = P;
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

const alinhado = (p: Passo) => p.tipo === "par" || p.tipo === "troca";

function inicioDaLeitura(passos: Passo[], lidos: Token[], esperados: string[]): Passo[] {
  const f = passos.findIndex(alinhado);
  const primeiro = passos[f];
  if (f <= 0 || primeiro.j === 0) return passos;
  const j0 = primeiro.j;
  const extras = passos.slice(0, f).filter((p) => p.tipo === "extra");
  let q = 0;
  for (let k = 1; k <= extras.length; k++) {
    if (lidos[(extras[k] ?? primeiro).i].intervalo >= PAUSA_CONVERSA_MS) q = k;
  }
  let fim = extras.length;
  while (fim > q && tentativaDe(lidos[extras[fim - 1].i].norm, esperados[j0])) fim--;
  const trecho = extras.slice(q, fim);
  const parece = trecho.some((p) => esperados.slice(0, j0).some((e) => e === lidos[p.i].norm || parecida(lidos[p.i].norm, e)));
  if (!trecho.length || (trecho.length <= CONVERSA_INICIO && !parece && trecho.length !== j0)) return passos;
  const trocas = Math.min(trecho.length, j0);
  return [
    ...extras.slice(0, fim - trocas),
    ...extras.slice(fim - trocas, fim).map((p, d): Passo => ({ tipo: "troca", i: p.i, j: d, di: 1, dj: 1 })),
    ...Array.from({ length: j0 - trocas }, (_, d): Passo => ({ tipo: "pulo", i: primeiro.i, j: trocas + d, di: 0, dj: 1 })),
    ...extras.slice(fim),
    ...passos.slice(f),
  ];
}

function mediana(valores: number[]) {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const meio = v.length >> 1;
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

function fechamento(normas: string[], idioma: Idioma) {
  const marcadas = normas.map(() => false);
  for (const frase of FECHAMENTO[idioma].map((f) => f.split(" ").map(normalizar))) {
    for (let k = 0; k + frase.length <= normas.length; k++) {
      if (frase.every((w, d) => normas[k + d] === w)) frase.forEach((_, d) => (marcadas[k + d] = true));
    }
  }
  const quantas = marcadas.filter(Boolean).length;
  return marcadas[0] || marcadas[marcadas.length - 1] || quantas * 2 >= marcadas.length;
}

function fimDaLeitura(passos: Passo[], lidos: Token[], esperados: string[], idioma: Idioma): Passo[] {
  const certa = passos.findLastIndex((p) => p.tipo === "par");
  if (certa < 0) return passos;
  const saltos = passos.slice(0, certa + 1).filter((p) => p.tipo !== "pulo" && Number.isFinite(lidos[p.i].salto)).map((p) => lidos[p.i].salto);
  const limiar = Math.max(PAUSA_RELATIVA_MS, RITMO_PAUSA * mediana(saltos));
  const pausa = passos.findIndex((p, k) => k > certa && p.tipo !== "pulo" && (lidos[p.i].intervalo >= PAUSA_CONVERSA_MS || lidos[p.i].salto >= limiar));
  if (pausa >= 0) {
    passos = [...passos.slice(0, pausa), ...passos.slice(pausa).filter((p) => p.tipo !== "pulo").map((p): Passo => (p.tipo === "troca" ? { ...p, tipo: "extra", dj: 0 } : p))];
  }
  const iPausa = pausa < 0 ? Infinity : passos[pausa].i;
  const u = passos.findLastIndex(alinhado);
  const cauda = passos.slice(u + 1).filter((p) => p.tipo === "extra");
  const antes = cauda.filter((p) => p.i < iPausa);
  const chutes = antes.filter((p) => !naJanela(lidos[p.i].norm, p.j, esperados));
  if (chutes.length <= CONVERSA_FIM || fechamento(chutes.map((p) => lidos[p.i].norm), idioma)) return passos;
  const proxima = passos[u].j + passos[u].dj;
  const trocadas = new Map(chutes.slice(0, esperados.length - proxima).map((p, d) => [p, d]));
  if (!trocadas.size) return passos;
  return [
    ...passos.slice(0, u + 1),
    ...cauda.map((p): Passo => (trocadas.has(p) ? { tipo: "troca", i: p.i, j: proxima + trocadas.get(p)!, di: 1, dj: 1 } : p)),
  ];
}

function montar(lidos: Token[], originais: string[], esperados: string[], idioma: Idioma) {
  const brutos = caminho(lidos, originais, esperados, idioma).filter((p) => !(p.tipo === "extra" && lidos[p.i].hesitacao));

  const falados = brutos.flatMap((p) => (p.tipo === "pulo" ? [] : lidos.slice(p.i, p.i + p.di)));
  falados.forEach((t, k) => {
    t.intervalo = k > 0 ? t.inicio - falados[k - 1].fim : Infinity;
    t.salto = k > 0 ? t.inicio - falados[k - 1].inicio : Infinity;
    t.pausa = t.intervalo > PAUSA_MS && k > 0;
  });
  const passos = fimDaLeitura(inicioDaLeitura(brutos, lidos, esperados), lidos, esperados, idioma);

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
    const juntos = lidos.slice(p.i, p.i + p.di);
    const normas = juntos.map((t) => t.norm);
    const emPedacos = p.di >= 2 && p.dj === 1 && normas.join("") === esperados[p.j] && normas.join(" ") !== partesDoHifen(originais[p.j]).join(" ");
    const silabas = contarSilabas(originais[p.j], idioma);
    const lenta = p.dj === 1 && silabas >= 2 && (ultimo.fim - primeiro.inicio) / silabas >= MS_POR_SILABA_SILABADA;
    if (emPedacos) item.dito = juntos.map((t) => t.texto).join(" ");
    if (emPedacos || lenta) item.silabada = true;
    const seguinte = passos[k + 1];
    if (p.di >= 2 && seguinte?.tipo === "extra" && lidos[seguinte.i].norm === esperados[p.j]) {
      Object.assign(item, { marca: "autocorrecao", dito: juntos.map((t) => t.texto).join(" "), fim: lidos[seguinte.i].fim });
      absorvidos.add(k + 1);
      return;
    }
    const tentativas: Token[] = [];
    let depois = primeiro;
    for (let a = k - 1; a >= 0; a--) {
      const anterior = passos[a];
      if (anterior.tipo !== "extra") break;
      const t = lidos[anterior.i];
      if (naJanela(t.norm, anterior.j, esperados) || !(tentativaDe(t.norm, esperados[p.j]) || fragmento(t.norm, esperados[p.j])) || depois.inicio - t.fim >= PAUSA_CONVERSA_MS) break;
      depois = t;
      tentativas.unshift(t);
      absorvidos.add(a);
    }
    if (tentativas.length) {
      Object.assign(item, { marca: "autocorrecao", dito: tentativas.map((x) => x.texto).join(" "), inicio: tentativas[0].inicio, hesitacao: tentativas[0].pausa });
    }
    if (tentativas.length >= 2 && tentativas.every((x) => fragmento(x.norm, esperados[p.j]))) item.silabada = true;
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
  const silabadas = itens.filter((i) => i.silabada && (i.marca === "correta" || i.marca === "autocorrecao")).length;
  return { itens, extras, corretas, erros, lidas: corretas + erros, segundos, pcpm: Math.round((corretas * 60) / segundos), silabadas };
}
