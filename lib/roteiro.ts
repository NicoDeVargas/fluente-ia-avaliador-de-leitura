import { normalizar, type Resultado } from "./alinhar.ts";
import { contarSilabas } from "./silabas.ts";
import { diferencaMediaAbsoluta, fracaoDentro } from "./estatistica.ts";

type Idioma = "pt" | "en";

export const TIPOS_INSTRUCAO = ["troca", "pula", "repete", "autocorrecao", "silaba"] as const;
export type TipoInstrucao = (typeof TIPOS_INSTRUCAO)[number];
export interface Instrucao { tipo: TipoInstrucao; indice: number; fim: number; dizer?: string }
export interface Gabarito { corretas: number; erros: number; silabadas: number; errosPorIndice: number[] }
export type Deteccao = "detectada" | "nao_detectada" | "nao_alcancada";

export const MAX_INSTRUCOES = 8;

const ALHEIAS: Record<Idioma, string[]> = {
  pt: ["janela", "sorvete", "caminhão", "tesoura", "cadeira", "panela", "relógio", "martelo", "abacaxi", "girafa"],
  en: ["window", "pocket", "jacket", "candle", "pencil", "basket", "ladder", "rocket", "hammer", "button"],
};
const FRACAO = 0.55;
const INICIO = 2;
const DISTANCIA = 3;
const JANELA_UNICA = 4;
const TENTATIVAS = 300;
const FIM_DE_FRASE = /[.!?…:;]["”’)]*$/;
const VOGAIS = "aeiouyáéíóúâêôãõàü";
const REPETICAO_PERTO_MS = 3000;

export function semente(n: number) {
  let s = n >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function palavrasDoTexto(corpo: string): string[] {
  return corpo
    .split(/\s+/)
    .flatMap((p) => p.split(/(?<=[–—])/))
    .filter((p) => normalizar(p) !== "");
}

export function inicioFalso(palavra: string): string {
  const w = palavra.toLowerCase().normalize("NFC").replace(/[^\p{L}]/gu, "");
  const m = w.match(new RegExp(`^[^${VOGAIS}]*[${VOGAIS}]+`, "u"));
  let p = m ? m[0] : w.slice(0, 2);
  if (p.length < 2) p = w.slice(0, 2);
  if (p.length >= w.length - 1) p = w.slice(0, Math.max(1, w.length - 2));
  return p;
}

function embaralhar<T>(lista: T[], aleatorio: () => number): T[] {
  const v = [...lista];
  for (let i = v.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
}

export function gerarRoteiro(corpo: string, idioma: Idioma, ano: number, aleatorio: () => number): Instrucao[] {
  const palavras = palavrasDoTexto(corpo);
  const normas = palavras.map(normalizar);
  const noTexto = new Set(normas);
  const limite = Math.min(palavras.length, Math.max(INICIO + 12, Math.floor(palavras.length * FRACAO)));
  const unica = (k: number) => normas.filter((w, j) => Math.abs(j - k) <= JANELA_UNICA && w === normas[k]).length === 1;
  const simples = (k: number) => !/[-‐‑]/.test(palavras[k]) && /^\p{L}+$/u.test(normas[k]) && unica(k);
  const alheias = (k: number) =>
    ALHEIAS[idioma].filter((a) => {
      const n = normalizar(a);
      return !noTexto.has(n) && n[0] !== normas[k][0] && !n.includes(normas[k]) && !normas[k].includes(n);
    });

  const candidato = (tipo: TipoInstrucao, k: number): Instrucao | null => {
    if (tipo === "pula") {
      const fim = k + 2 + Math.floor(aleatorio() * 3);
      if (fim >= limite) return null;
      for (let j = k; j < fim; j++) if (FIM_DE_FRASE.test(palavras[j])) return null;
      return { tipo, indice: k, fim };
    }
    if (!simples(k)) return null;
    if (tipo === "troca") {
      const opcoes = alheias(k);
      if (normas[k].length < 3 || !opcoes.length) return null;
      return { tipo, indice: k, fim: k, dizer: opcoes[Math.floor(aleatorio() * opcoes.length)] };
    }
    if (tipo === "repete") return normas[k].length >= 3 ? { tipo, indice: k, fim: k } : null;
    if (tipo === "autocorrecao") return normas[k].length >= 4 ? { tipo, indice: k, fim: k, dizer: inicioFalso(palavras[k]) } : null;
    return contarSilabas(palavras[k], idioma) >= 3 ? { tipo, indice: k, fim: k } : null;
  };

  const quantos = 3 + Math.floor(aleatorio() * (ano <= 2 ? 2 : 3));
  const roteiro: Instrucao[] = [];
  for (const tipo of embaralhar([...TIPOS_INSTRUCAO], aleatorio)) {
    if (roteiro.length >= quantos) break;
    for (let t = 0; t < TENTATIVAS; t++) {
      const k = INICIO + Math.floor(aleatorio() * (limite - INICIO));
      const c = candidato(tipo, k);
      if (!c) continue;
      if (roteiro.every((o) => c.indice - o.fim > DISTANCIA || o.indice - c.fim > DISTANCIA)) {
        roteiro.push(c);
        break;
      }
    }
  }
  return roteiro.sort((a, b) => a.indice - b.indice);
}

export function gabaritoDoRoteiro(roteiro: Instrucao[], corpo: string, ultimoIndiceAlcancado: number): Gabarito {
  const alcance = Math.min(ultimoIndiceAlcancado, palavrasDoTexto(corpo).length - 1);
  const erros = new Set<number>();
  for (const i of roteiro) {
    if (i.tipo === "troca") erros.add(i.indice);
    if (i.tipo === "pula") for (let k = i.indice; k <= i.fim; k++) erros.add(k);
  }
  const errosPorIndice = [...erros].filter((k) => k <= alcance).sort((a, b) => a - b);
  const silabadas = roteiro.filter((i) => i.tipo === "silaba" && i.indice <= alcance).length;
  return { corretas: Math.max(0, alcance + 1 - errosPorIndice.length), erros: errosPorIndice.length, silabadas, errosPorIndice };
}

export function ultimoAlcancado(resultado: Resultado): number {
  return resultado.itens.findLastIndex((i) => i.marca !== "nao_lida");
}

export function detectar(instrucao: Instrucao, resultado: Resultado): Deteccao {
  const { itens, extras } = resultado;
  if (instrucao.fim > ultimoAlcancado(resultado)) return "nao_alcancada";
  const item = itens[instrucao.indice];
  const certa = item.marca === "correta" || item.marca === "autocorrecao";
  let ok = false;
  if (instrucao.tipo === "troca") ok = item.marca === "trocada";
  if (instrucao.tipo === "pula") ok = itens.slice(instrucao.indice, instrucao.fim + 1).every((i) => i.marca === "pulada");
  if (instrucao.tipo === "autocorrecao") ok = certa;
  if (instrucao.tipo === "silaba") ok = certa && !!item.silabada;
  if (instrucao.tipo === "repete") {
    const alvo = normalizar(item.esperada);
    ok =
      certa &&
      item.inicio !== undefined &&
      extras.some(
        (e) => e.tipo === "repeticao" && normalizar(e.texto) === alvo && e.inicio >= item.inicio! - REPETICAO_PERTO_MS && e.inicio <= (item.fim ?? item.inicio!) + REPETICAO_PERTO_MS,
      );
  }
  return ok ? "detectada" : "nao_detectada";
}

export function errosDoApp(resultado: Resultado): number[] {
  return resultado.itens.filter((i) => i.marca === "trocada" || i.marca === "pulada").map((i) => i.indice);
}

export interface LeituraRoteirizada { leitor: string; roteiro: Instrucao[]; gabarito: Gabarito; resultado: Resultado }
export interface Taxa { detectadas: number; total: number }
export interface ResumoRoteiros {
  n: number;
  leitores: number;
  diferenca: number | null;
  dentro1: number | null;
  dentro3: number | null;
  precisao: number | null;
  revocacao: number | null;
  porTipo: Record<TipoInstrucao, Taxa>;
  silabadasForaDoRoteiro: number;
}

export function resumirRoteiros(linhas: LeituraRoteirizada[]): ResumoRoteiros {
  const pares = linhas.map((l) => ({ app: l.resultado.corretas, humano: l.gabarito.corretas }));
  let casados = 0;
  let apontados = 0;
  let reais = 0;
  let foraDoRoteiro = 0;
  const porTipo = Object.fromEntries(TIPOS_INSTRUCAO.map((t) => [t, { detectadas: 0, total: 0 }])) as Record<TipoInstrucao, Taxa>;
  for (const l of linhas) {
    const app = errosDoApp(l.resultado);
    const gabarito = new Set(l.gabarito.errosPorIndice);
    casados += app.filter((k) => gabarito.has(k)).length;
    apontados += app.length;
    reais += gabarito.size;
    for (const i of l.roteiro) {
      const d = detectar(i, l.resultado);
      if (d === "nao_alcancada") continue;
      porTipo[i.tipo].total++;
      if (d === "detectada") porTipo[i.tipo].detectadas++;
    }
    const silabas = new Set(l.roteiro.filter((i) => i.tipo === "silaba").map((i) => i.indice));
    foraDoRoteiro += l.resultado.itens.filter((i) => i.silabada && (i.marca === "correta" || i.marca === "autocorrecao") && !silabas.has(i.indice)).length;
  }
  return {
    n: linhas.length,
    leitores: new Set(linhas.map((l) => l.leitor.trim().toLowerCase())).size,
    diferenca: diferencaMediaAbsoluta(pares),
    dentro1: fracaoDentro(pares, 1),
    dentro3: fracaoDentro(pares, 3),
    precisao: apontados ? casados / apontados : null,
    revocacao: reais ? casados / reais : null,
    porTipo,
    silabadasForaDoRoteiro: foraDoRoteiro,
  };
}
