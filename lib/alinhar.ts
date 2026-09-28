export interface PalavraLida { texto: string; inicio: number; fim: number }
export type Marca = "correta" | "trocada" | "pulada" | "autocorrecao" | "nao_lida";
export interface ItemTexto { indice: number; esperada: string; marca: Marca; dito?: string; inicio?: number; fim?: number; hesitacao?: boolean }
export interface Extra { texto: string; inicio: number; fim: number; tipo: "repeticao" | "insercao" }
export interface Resultado { itens: ItemTexto[]; extras: Extra[]; corretas: number; erros: number; lidas: number; segundos: number; pcpm: number }

const HESITACOES = {
  pt: new Set(["é", "hã", "ahn", "hum", "hm", "eh", "ah"]),
  en: new Set(["um", "uh", "er", "ah", "hmm", "eh"]),
};
const LIMITE_MS = 60000;
const PAUSA_MS = 3000;
const TROCA = 10;
const INSERCAO = 10;
const PULO = 10;
const PULO_SEGUINTE = 1;
const JANELA_REPETICAO = 3;

interface Token { texto: string; norm: string; inicio: number; fim: number; hesitacao: boolean; pausa: boolean }
type Passo = { tipo: "par"; i: number; j: number } | { tipo: "extra"; i: number; j: number } | { tipo: "pulo"; j: number };

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

function ehHesitacao(p: string, idioma: "pt" | "en") {
  return HESITACOES[idioma].has(p.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]/gu, ""));
}

function distancia(a: string, b: string) {
  let anterior = Array.from({ length: b.length + 1 }, (_, k) => k);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

function parecida(tentativa: string, alvo: string) {
  if (tentativa === alvo) return false;
  return alvo.startsWith(tentativa) || distancia(tentativa, alvo) <= Math.max(1, Math.floor(alvo.length / 3));
}

function lerTokens(palavras: PalavraLida[], idioma: "pt" | "en"): Token[] {
  return palavras
    .filter((p) => p.inicio < LIMITE_MS)
    .flatMap((p) =>
      pedacos(p.texto).map((texto) => ({
        texto,
        norm: normalizar(texto),
        inicio: p.inicio,
        fim: p.fim,
        hesitacao: ehHesitacao(texto, idioma),
        pausa: false,
      })),
    );
}

function caminho(lidos: Token[], esperados: string[]): Passo[] {
  const n = lidos.length;
  const m = esperados.length;
  const D = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const E = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const insercao = (i: number) => (lidos[i].hesitacao ? 0 : INSERCAO);
  const troca = (i: number, j: number) => (lidos[i].norm === esperados[j] ? 0 : TROCA);

  for (let i = n - 1; i >= 0; i--) {
    D[i][m] = E[i][m] = insercao(i) + D[i + 1][m];
    for (let j = m - 1; j >= 0; j--) {
      const avanco = Math.min(troca(i, j) + D[i + 1][j + 1], insercao(i) + D[i + 1][j]);
      D[i][j] = Math.min(avanco, PULO + E[i][j + 1]);
      E[i][j] = Math.min(avanco, PULO_SEGUINTE + E[i][j + 1]);
    }
  }

  const passos: Passo[] = [];
  let i = 0;
  let j = 0;
  let pulando = false;
  while (i < n) {
    const atual = pulando ? E[i][j] : D[i][j];
    if (j < m && troca(i, j) + D[i + 1][j + 1] === atual) {
      passos.push({ tipo: "par", i, j });
      i++;
      j++;
      pulando = false;
    } else if (insercao(i) + D[i + 1][j] === atual) {
      passos.push({ tipo: "extra", i, j });
      i++;
      pulando = false;
    } else {
      passos.push({ tipo: "pulo", j });
      j++;
      pulando = true;
    }
  }
  return passos;
}

export function alinhar(corpo: string, palavras: PalavraLida[], idioma: "pt" | "en"): Resultado {
  const originais = pedacos(corpo);
  const esperados = originais.map(normalizar);
  const lidos = lerTokens(palavras, idioma);
  const passos = caminho(lidos, esperados).filter((p) => p.tipo !== "extra" || !lidos[p.i].hesitacao);

  let fimAnterior = 0;
  let ultimoFim = 0;
  for (const p of passos) {
    if (p.tipo === "pulo") continue;
    const t = lidos[p.i];
    t.pausa = t.inicio - fimAnterior > PAUSA_MS;
    fimAnterior = ultimoFim = t.fim;
  }

  const itens: ItemTexto[] = originais.map((esperada, indice) => ({ indice, esperada, marca: "nao_lida" }));
  const extras: Extra[] = [];
  const ultimoPar = passos.findLastIndex((p) => p.tipo === "par");
  const absorvidos = new Set<number>();

  for (let k = 0; k < passos.length; k++) {
    const p = passos[k];
    if (p.tipo === "pulo") {
      if (k < ultimoPar) itens[p.j].marca = "pulada";
      continue;
    }
    if (p.tipo === "extra") continue;
    const t = lidos[p.i];
    const item = itens[p.j];
    Object.assign(item, { inicio: t.inicio, fim: t.fim, hesitacao: t.pausa });
    if (t.norm === esperados[p.j]) {
      item.marca = "correta";
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
    } else {
      item.marca = "trocada";
      item.dito = t.texto;
    }
  }

  for (const [k, p] of passos.entries()) {
    if (p.tipo !== "extra" || absorvidos.has(k)) continue;
    const t = lidos[p.i];
    extras.push({ texto: t.texto, inicio: t.inicio, fim: t.fim, tipo: naJanela(t.norm, p.j, esperados) ? "repeticao" : "insercao" });
  }

  const conta = (...marcas: Marca[]) => itens.filter((i) => marcas.includes(i.marca)).length;
  const corretas = conta("correta", "autocorrecao");
  const erros = conta("trocada", "pulada");
  const segundos = Math.max(1, Math.min(60, Math.round(ultimoFim) / 1000));
  return { itens, extras, corretas, erros, lidas: corretas + erros, segundos, pcpm: Math.round((corretas * 60) / segundos) };
}

function naJanela(norm: string, j: number, esperados: string[]) {
  for (let k = Math.max(0, j - JANELA_REPETICAO); k <= Math.min(j, esperados.length - 1); k++) {
    if (esperados[k] === norm) return true;
  }
  return false;
}
