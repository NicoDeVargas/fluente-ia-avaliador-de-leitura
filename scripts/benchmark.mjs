import { registerHooks } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

registerHooks({
  resolve(especificador, contexto, proximo) {
    if (especificador === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    return proximo(especificador, contexto);
  },
});

const { TEXTOS } = await import("../lib/textos.ts");
const { alinhar, normalizar } = await import("../lib/alinhar.ts");
const { transcrever } = await import("../lib/transcrever.ts");

const RAIZ = path.resolve(import.meta.dirname, "..");
const PASTA_AUDIO = path.join(RAIZ, "bench", "audio");
const SAIDA = path.join(RAIZ, "bench", "resultados.json");
const MAX_PALAVRAS = 70;
const NOVO = process.argv.includes("--novo");
const RETRANSCREVER = NOVO || process.argv.includes("--retranscrever");

const VOZ = { pt: "Microsoft Maria Desktop", en: "Microsoft Zira Desktop" };
const LINGUA = { pt: "pt-BR", en: "en-US" };
const HESITACAO = { pt: "hã", en: "um" };
const ALHEIAS = { pt: ["janela", "sorvete", "caminhão", "tesoura"], en: ["window", "pocket", "jacket", "candle"] };
const VOGAIS = { a: "e", e: "a", i: "o", o: "i", u: "o" };

process.loadEnvFile(path.join(RAIZ, ".env.local"));

function palavras(corpo) {
  return corpo.split(/\s+/).flatMap((p) => p.split(/(?<=[-‐‑–—])/)).filter((p) => normalizar(p) !== "");
}

function trocarMiolo(original, nova) {
  const m = original.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  return m[1] + nova + m[3];
}

function alvo(ws, n, fracao, usados) {
  const contagem = new Map();
  ws.slice(0, n).forEach((w) => contagem.set(normalizar(w), (contagem.get(normalizar(w)) ?? 0) + 1));
  for (let k = Math.floor(n * fracao); k < n - 1; k++) {
    const norm = normalizar(ws[k]);
    if (norm.length >= 4 && contagem.get(norm) === 1 && ![...usados].some((u) => Math.abs(u - k) <= 2)) {
      usados.add(k);
      return k;
    }
  }
  throw new Error(`sem alvo em ${fracao}`);
}

function alheia(idioma, k, ws) {
  const opcoes = ALHEIAS[idioma].filter((a) => !ws.map(normalizar).includes(normalizar(a)));
  return opcoes[k % opcoes.length];
}

function pseudo(palavra) {
  const letras = [...palavra];
  const i = letras.findIndex((c, d) => d > 0 && VOGAIS[c.toLowerCase()]);
  const pos = i >= 0 ? i : letras.findIndex((c) => VOGAIS[c.toLowerCase()]);
  letras[pos] = VOGAIS[letras[pos].toLowerCase()];
  return letras.join("");
}

function cenarios(texto) {
  const ws = palavras(texto.corpo);
  const n = Math.min(ws.length, MAX_PALAVRAS);
  const idioma = texto.idioma;
  const fala = (k) => ({ dizer: ws[k] });
  const base = (fim) => Array.from({ length: fim }, (_, k) => [fala(k)]);
  const todos = (fim) => Array.from({ length: fim }, (_, k) => k);
  const lista = [];

  lista.push({ cenario: "limpo", partes: base(n), corretas: todos(n), erros: [], eventos: [] });

  {
    const usados = new Set();
    const a = alvo(ws, n, 0.3, usados);
    const b = alvo(ws, n, 0.6, usados);
    const partes = base(n);
    const nova = alheia(idioma, a, ws);
    const falsa = pseudo(normalizar(ws[b]));
    partes[a] = [{ dizer: trocarMiolo(ws[a], nova) }];
    partes[b] = [{ dizer: trocarMiolo(ws[b], falsa) }];
    lista.push({
      cenario: "duas_trocas",
      partes,
      corretas: todos(n).filter((k) => k !== a && k !== b),
      erros: [a, b],
      eventos: [
        { tipo: "troca_alheia", indice: a, esperada: ws[a], dita: nova },
        { tipo: "troca_pseudopalavra", indice: b, esperada: ws[b], dita: falsa },
      ],
    });
  }

  {
    const inicio = Math.floor(n * 0.45);
    const tamanho = 4;
    const pulados = Array.from({ length: tamanho }, (_, d) => inicio + d);
    const partes = base(n).map((p, k) => (pulados.includes(k) ? [] : p));
    lista.push({
      cenario: "frase_pulada",
      partes,
      corretas: todos(n).filter((k) => !pulados.includes(k)),
      erros: pulados,
      eventos: [{ tipo: "pulo", indices: pulados, trecho: pulados.map((k) => ws[k]).join(" ") }],
    });
  }

  {
    const usados = new Set();
    const r = Math.floor(n * 0.3);
    usados.add(r).add(r + 1);
    const c = alvo(ws, n, 0.65, usados);
    const partes = base(n);
    partes[r + 1] = [fala(r + 1), { dizer: normalizar(ws[r]) }, { dizer: ws[r + 1] }];
    const fragmento = normalizar(ws[c]).slice(0, 2);
    partes[c] = [{ dizer: `${fragmento}…`, pausa: 400 }, fala(c)];
    lista.push({
      cenario: "repeticao_autocorrecao",
      partes,
      corretas: todos(n),
      erros: [],
      eventos: [
        { tipo: "repeticao", indices: [r, r + 1], trecho: `${ws[r]} ${ws[r + 1]}` },
        { tipo: "autocorrecao", indice: c, esperada: ws[c], fragmento },
      ],
    });
  }

  {
    const usados = new Set();
    const h = Math.floor(n * 0.25);
    usados.add(h);
    const fim = Math.floor(n * 0.6);
    const s = alvo(ws, fim, 0.6, usados);
    const partes = base(fim);
    partes[h] = [{ dizer: HESITACAO[idioma], pausa: 600 }, fala(h)];
    const nova = alheia(idioma, s + 1, ws);
    partes[s] = [{ dizer: trocarMiolo(ws[s], nova) }];
    lista.push({
      cenario: "hesitacao_troca_parada",
      partes,
      corretas: todos(fim).filter((k) => k !== s),
      erros: [s],
      eventos: [
        { tipo: "hesitacao", antesDe: h, dita: HESITACAO[idioma] },
        { tipo: "troca_alheia", indice: s, esperada: ws[s], dita: nova },
        { tipo: "parada", ultimaLida: fim - 1 },
      ],
    });
  }

  return lista.map((l) => ({ ...l, texto: texto.id, idioma, n, ws }));
}

function xml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ssml(leitura) {
  const corpo = leitura.partes
    .flat()
    .map((p) => xml(p.dizer) + (p.pausa ? ` <break time="${p.pausa}ms"/>` : ""))
    .join(" ");
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LINGUA[leitura.idioma]}"><voice name="${VOZ[leitura.idioma]}"><prosody rate="-10%">${corpo}</prosody></voice></speak>`;
}

function roteiro(leitura) {
  return leitura.partes.flat().map((p) => p.dizer).join(" ");
}

function sintetizar(pendentes) {
  if (!pendentes.length) return;
  const lista = pendentes.map((l) => `${l.ssml}|${l.wav}`).join("\n");
  const arquivoLista = path.join(PASTA_AUDIO, "lista.txt");
  writeFileSync(arquivoLista, lista, "utf8");
  const ps = [
    "Add-Type -AssemblyName System.Speech",
    `$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)`,
    `Get-Content -Encoding UTF8 '${arquivoLista}' | ForEach-Object {`,
    "  $p = $_.Split('|')",
    "  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "  $s.SetOutputToWaveFile($p[1], $fmt)",
    "  $s.SpeakSsml([System.IO.File]::ReadAllText($p[0], [System.Text.Encoding]::UTF8))",
    "  $s.Dispose()",
    "}",
  ].join("\n");
  const arquivoPs = path.join(PASTA_AUDIO, "sintetizar.ps1");
  writeFileSync(arquivoPs, "﻿" + ps, "utf8");
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", arquivoPs], { stdio: "inherit" });
}

function ouvidoEm(r, indice) {
  const item = r.itens[indice];
  return { marca: item.marca, dito: item.dito ?? null };
}

function artefatos(leitura, r, transcrito) {
  const normas = transcrito.map((p) => normalizar(p.texto));
  return leitura.eventos.map((e) => {
    if (e.tipo === "troca_alheia" || e.tipo === "troca_pseudopalavra") {
      const dita = normalizar(e.dita);
      const noTexto = leitura.ws.slice(0, leitura.n).filter((w) => normalizar(w) === dita).length;
      const ouviu = normas.filter((w) => w === dita).length > noTexto;
      return { ...e, asrTranscreveuDita: ouviu, app: ouvidoEm(r, e.indice) };
    }
    if (e.tipo === "autocorrecao") {
      const alvoNorm = normalizar(e.esperada);
      const k = normas.findIndex((w) => w === alvoNorm);
      const antes = k > 0 ? normas[k - 1] : null;
      return { ...e, asrAntes: antes, asrManteveFragmento: !!antes && antes !== alvoNorm && alvoNorm.startsWith(antes), app: ouvidoEm(r, e.indice) };
    }
    if (e.tipo === "hesitacao") {
      return { ...e, asrTranscreveu: transcrito.some((p) => normalizar(p.texto) === normalizar(e.dita)) };
    }
    if (e.tipo === "repeticao") {
      const [a, b] = e.trecho.split(" ").map(normalizar);
      let vezes = 0;
      for (let k = 0; k + 1 < normas.length; k++) if (normas[k] === a && normas[k + 1] === b) vezes++;
      return { ...e, asrOcorrencias: vezes, extras: r.extras.map((x) => `${x.texto}:${x.tipo}`) };
    }
    if (e.tipo === "pulo") {
      return { ...e, app: e.indices.map((i) => r.itens[i].marca) };
    }
    return e;
  });
}

const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const pct = (x) => `${(100 * x).toFixed(0)}%`;

mkdirSync(PASTA_AUDIO, { recursive: true });
const leituras = TEXTOS.flatMap(cenarios).map((l) => {
  const nome = `${l.texto}__${l.cenario}`;
  return { ...l, nome, ssml: path.join(PASTA_AUDIO, `${nome}.ssml`), wav: path.join(PASTA_AUDIO, `${nome}.wav`), json: path.join(PASTA_AUDIO, `${nome}.json`) };
});

const pendentes = [];
for (const l of leituras) {
  const conteudo = ssml(l);
  const antigo = existsSync(l.ssml) ? readFileSync(l.ssml, "utf8") : null;
  if (NOVO || antigo !== conteudo || !existsSync(l.wav)) {
    writeFileSync(l.ssml, conteudo, "utf8");
    pendentes.push(l);
  }
}
console.log(`sintetizando ${pendentes.length} de ${leituras.length} áudios`);
sintetizar(pendentes);
const refeitos = new Set(pendentes.map((l) => l.nome));

const resultados = [];
for (const l of leituras) {
  let transcrito;
  if (!RETRANSCREVER && !refeitos.has(l.nome) && existsSync(l.json)) {
    transcrito = JSON.parse(readFileSync(l.json, "utf8"));
  } else {
    const buf = readFileSync(l.wav);
    transcrito = await transcrever(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), l.idioma);
    writeFileSync(l.json, JSON.stringify(transcrito), "utf8");
  }
  const texto = TEXTOS.find((t) => t.id === l.texto);
  const r = alinhar(texto.corpo, transcrito, l.idioma);
  const errosApp = r.itens.filter((i) => i.marca === "trocada" || i.marca === "pulada").map((i) => i.indice);
  const acertos = errosApp.filter((i) => l.erros.includes(i)).length;
  resultados.push({
    texto: l.texto,
    idioma: l.idioma,
    cenario: l.cenario,
    roteiro: roteiro(l),
    transcricao: transcrito.map((p) => p.texto).join(" "),
    gabarito: { corretas: l.corretas.length, erros: l.erros.length, indicesErro: l.erros },
    app: { corretas: r.corretas, erros: r.erros, segundos: r.segundos, pcpm: r.pcpm, indicesErro: errosApp },
    difCorretas: Math.abs(r.corretas - l.corretas.length),
    difErros: Math.abs(r.erros - l.erros.length),
    errosCasados: acertos,
    artefatos: artefatos(l, r, transcrito),
  });
  console.log(`${l.nome.padEnd(48)} gabarito ${l.corretas.length}/${l.erros.length}  app ${r.corretas}/${r.erros}  pcpm ${r.pcpm}`);
}

const difs = resultados.map((r) => r.difCorretas);
const vp = resultados.reduce((a, r) => a + r.errosCasados, 0);
const apontados = resultados.reduce((a, r) => a + r.app.indicesErro.length, 0);
const reais = resultados.reduce((a, r) => a + r.gabarito.indicesErro.length, 0);
const eventos = resultados.flatMap((r) => r.artefatos);
const trocas = eventos.filter((e) => e.tipo === "troca_alheia" || e.tipo === "troca_pseudopalavra");
const porTipo = (tipo) => trocas.filter((e) => e.tipo === tipo);
const corrigidas = (lista) => lista.filter((e) => !e.asrTranscreveuDita).length;
const autocorr = eventos.filter((e) => e.tipo === "autocorrecao");
const hes = eventos.filter((e) => e.tipo === "hesitacao");
const reps = eventos.filter((e) => e.tipo === "repeticao");

const resumo = {
  n: resultados.length,
  mediaDifCorretas: Number(media(difs).toFixed(2)),
  dentroDe1: Number((difs.filter((d) => d <= 1).length / difs.length).toFixed(3)),
  dentroDe3: Number((difs.filter((d) => d <= 3).length / difs.length).toFixed(3)),
  exatos: difs.filter((d) => d === 0).length,
  errosGabarito: reais,
  errosApp: apontados,
  precisaoErros: apontados ? Number((vp / apontados).toFixed(3)) : null,
  revocacaoErros: reais ? Number((vp / reais).toFixed(3)) : null,
  asr: {
    trocaAlheiaNaoLiteral: `${corrigidas(porTipo("troca_alheia"))}/${porTipo("troca_alheia").length}`,
    pseudopalavraViraCorreta: `${porTipo("troca_pseudopalavra").filter((e) => e.app.marca === "correta").length}/${porTipo("troca_pseudopalavra").length}`,
    fragmentoMantido: `${autocorr.filter((e) => e.asrManteveFragmento).length}/${autocorr.length}`,
    hesitacaoTranscrita: `${hes.filter((e) => e.asrTranscreveu).length}/${hes.length}`,
    repeticaoMantida: `${reps.filter((e) => e.asrOcorrencias >= 2).length}/${reps.length}`,
  },
  aviso: "voz sintética adulta (Windows System.Speech: Maria pt-BR, Zira en-US), não é voz de criança; mede o pipeline, não a leitura infantil real",
};

writeFileSync(SAIDA, JSON.stringify({ geradoEm: new Date().toISOString().slice(0, 10), resumo, resultados }, null, 2) + "\n", "utf8");

console.log("");
console.log(`leituras: ${resumo.n}`);
console.log(`|dif| médio em palavras corretas: ${resumo.mediaDifCorretas}  (exatas ${resumo.exatos}/${resumo.n})`);
console.log(`dentro de ±1: ${pct(resumo.dentroDe1)}   dentro de ±3: ${pct(resumo.dentroDe3)}`);
console.log(`erros: gabarito ${reais}, app ${apontados}, casados ${vp}  precisão ${pct(resumo.precisaoErros ?? 0)}  revocação ${pct(resumo.revocacaoErros ?? 0)}`);
console.log(`ASR: troca alheia não transcrita literalmente ${resumo.asr.trocaAlheiaNaoLiteral}, pseudopalavra virou a palavra certa ${resumo.asr.pseudopalavraViraCorreta}, fragmento mantido ${resumo.asr.fragmentoMantido}, hesitação transcrita ${resumo.asr.hesitacaoTranscrita}, repetição mantida ${resumo.asr.repeticaoMantida}`);
console.log(`aviso: ${resumo.aviso}`);
console.log(`resultado em ${path.relative(RAIZ, SAIDA)}`);
