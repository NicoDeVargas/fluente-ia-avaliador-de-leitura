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
interface Movimento { tipo: Tipo; di: number; dj: number; custo: number; proximo: number }
interface Passo { tipo: Tipo; i: number; j: number; di: number; dj: number }

function equivalentes(idioma: Idioma) {
  const mapa = new Map<string, Set<string>>();
  const juntar = (lido: string, esperado: string) => mapa.set(lido, (mapa.get(lido) ?? new Set()).add(normalizar(esperado)));
  NUMEROS[idioma].forEach((palavras, n) => palavras.split(" ").forEach((p) => juntar(String(n), p)));
  Object.entries(VARIANTES[idioma]).forEach(([lido, esperado]) => juntar(lido, esperado));
  return mapa;
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

function naJanela(norm: string, j: number, esperados: string[]) {
  for (let k = Math.max(0, j - JANELA_REPETICAO); k <= Math.min(j, esperados.length - 1); k++) {
    if (esperados[k] === norm) return true;
  }
  return false;
}

function lerTokens(palavras: PalavraLida[], idioma: Idioma): Token[] {
  const tokens = palavras.flatMap((p) =>
    pedacos(p.texto).map((texto) => ({ texto, norm: normalizar(texto), inicio: p.inicio, fim: p.fim, hesitacao: ehHesitacao(texto, idioma), pausa: false })),
  );
  const partida = tokens.find((t) => !t.hesitacao)?.inicio ?? 0;
  return tokens.filter((t) => t.inicio < partida + LIMITE_MS);
}

function caminho(lidos: Token[], esperados: string[], idioma: Idioma): Passo[] {
  const n = lidos.length;
  const m = esperados.length;
  const estados = ACERTOS_APOS_SALTO + 1;
  const largura = m + 1;
  const V = Array.from({ length: estados }, () => new Float64Array((n + 1) * largura).fill(Infinity));
  const valor = (s: number, i: number, j: number) => V[s][i * largura + j];
  const equivale = (lido: string, esperado: string) => lido === esperado || !!EQUIVALENTES[idioma].get(lido)?.has(esperado);
  const juntas = (lido: string, a: string, b: string) => lido === a + b || normalizar(CONTRACOES[idioma][lido] ?? "") === a + b;
  const depoisDeAcerto = (s: number) => (s === 1 ? ACERTOS_APOS_SALTO : s <= 2 ? 0 : s - 1);

  function movimentos(s: number, i: number, j: number): Movimento[] {
    const lista: Movimento[] = [];
    const t = lidos[i];
    const proximo = depoisDeAcerto(s);
    if (j < m) {
      const igual = equivale(t.norm, esperados[j]);
      if (igual) lista.push({ tipo: "par", di: 1, dj: 1, custo: -ACERTO, proximo });
      if (i + 1 < n && !lidos[i + 1].hesitacao && t.norm + lidos[i + 1].norm === esperados[j]) lista.push({ tipo: "par", di: 2, dj: 1, custo: -ACERTO, proximo });
      if (j + 1 < m && juntas(t.norm, esperados[j], esperados[j + 1])) lista.push({ tipo: "par", di: 1, dj: 2, custo: -2 * ACERTO, proximo });
      if (s === 0 && !igual) lista.push({ tipo: "troca", di: 1, dj: 1, custo: EDICAO, proximo: 0 });
    }
    if (t.hesitacao) lista.push({ tipo: "extra", di: 1, dj: 0, custo: 0, proximo: s });
    else if (s === 0) lista.push({ tipo: "extra", di: 1, dj: 0, custo: naJanela(t.norm, j, esperados) ? EDICAO - REPETICAO : EDICAO, proximo: 0 });
    if (j < m && s === 0) {
      lista.push({ tipo: "pulo", di: 0, dj: 1, custo: EDICAO, proximo: 0 });
      lista.push({ tipo: "pulo", di: 0, dj: 1, custo: EDICAO, proximo: 1 });
    }
    if (j < m && s === 1) lista.push({ tipo: "pulo", di: 0, dj: 1, custo: PULO_SEGUINTE, proximo: 1 });
    return lista;
  }

  for (let j = 0; j <= m; j++) V[0][n * largura + j] = 0;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      for (let s = 0; s < estados; s++) {
        let melhor = Infinity;
        for (const mv of movimentos(s, i, j)) melhor = Math.min(melhor, mv.custo + valor(mv.proximo, i + mv.di, j + mv.dj));
        V[s][i * largura + j] = melhor;
      }
    }
  }

  const passos: Passo[] = [];
  let i = 0;
  let j = 0;
  let s = 0;
  while (i < n) {
    const atual = valor(s, i, j);
    const mv = movimentos(s, i, j).find((x) => x.custo + valor(x.proximo, i + x.di, j + x.dj) === atual)!;
    passos.push({ tipo: mv.tipo, i, j, di: mv.di, dj: mv.dj });
    i += mv.di;
    j += mv.dj;
    s = mv.proximo;
  }
  return passos;
}

export function alinhar(corpo: string, palavras: PalavraLida[], idioma: Idioma): Resultado {
  const originais = pedacos(corpo);
  const esperados = originais.map(normalizar);
  const lidos = lerTokens(palavras, idioma);
  const passos = caminho(lidos, esperados, idioma).filter((p) => !(p.tipo === "extra" && lidos[p.i].hesitacao));

  const falados = passos.flatMap((p) => (p.tipo === "pulo" ? [] : lidos.slice(p.i, p.i + p.di)));
  falados.forEach((t, k) => (t.pausa = k > 0 && t.inicio - falados[k - 1].fim > PAUSA_MS));
  const partida = falados[0]?.inicio ?? 0;

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

  const conta = (...marcas: Marca[]) => itens.filter((i) => marcas.includes(i.marca)).length;
  const corretas = conta("correta", "autocorrecao");
  const erros = conta("trocada", "pulada");
  const fins = itens.filter((i) => i.fim !== undefined).map((i) => i.fim!);
  const segundos = fins.length ? Math.max(1, Math.min(60, Math.round(Math.max(...fins) - partida) / 1000)) : 1;
  return { itens, extras, corretas, erros, lidas: corretas + erros, segundos, pcpm: Math.round((corretas * 60) / segundos) };
}
