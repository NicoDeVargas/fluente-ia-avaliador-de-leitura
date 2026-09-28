# Fluente: design

Data: 27/09/2026. Destino: AssemblyAI Voice Agent Hackathon (lablab.ai), envio até 29/09/2026
(prazo oficial 30/09 manhã). Pivô do Sinal de Alarme: a voz sintética ficou ruim e a ideia não
empolgou; o Fluente usa só o **ouvido** da AssemblyAI.

## 1. Problema

O Brasil avalia a **fluência leitora** das crianças (Compromisso Nacional Criança Alfabetizada)
com a métrica **palavras corretas por minuto (PCPM)**: a professora escuta cada aluno ler um texto
por 1 minuto e conta à mão. Numa turma de 30, uma tarde inteira por rodada, contagem sujeita a
erro, por isso feita poucas vezes por ano.

## 2. Produto

Web app, mobile-first, sem login. Inglês por padrão (jurados); `?lang=pt` para a validação.

1. **Início:** escolhe o texto (lista por ano escolar), informa apelido do leitor e ano.
2. **Leitura:** o texto aparece grande; botão Começar; grava **60 s** com contador visível e
   botão "Terminei" para quem acabar antes. Gravação com `MediaRecorder` (webm/opus ou mp4 no
   Safari).
3. **Resultado (poucos segundos):** PCPM em destaque; palavras corretas, erros, palavras lidas,
   tempo; o texto colorido palavra a palavra (correta, trocada — mostrando o que foi dito —,
   pulada, repetição, autocorreção, hesitação longa); tocar numa palavra toca o áudio daquele
   trecho (áudio só no navegador, nunca salvo no servidor); comparação com a referência do ano.
4. **Contagem manual (opcional):** quem ouviu digita quantas palavras corretas contou no minuto.
   É a base da prova de precisão.
5. **`/estudo` (público):** leituras com contagem manual; diferença média |app − humano|, % com
   diferença ≤ 3, correlação simples, n de leituras e de leitores; método e limites.

## 3. Técnica

- **Transcrição:** API de arquivo gravado da AssemblyAI (`POST /v2/upload` +
  `POST /v2/transcript` + polling), `speech_models: ["universal-3-5-pro"]`,
  `language_code` `pt` ou `en`, `disfluencies: true`. **Sem `keyterms_prompt` nem `prompt` com
  o texto**: dar o texto ao reconhecedor o faria "corrigir" a leitura e esconder erros. Cada palavra
  vem com `start`/`end` (ms).
- **Alinhamento (função pura, sem LLM):** normaliza (minúsculas, sem acento, sem pontuação);
  remove hesitações ("é", "hã", "ahn", "hum", "um", "uh", "er", "ah") da sequência e as registra
  como pausa; considera só palavras com `start < 60000`; programação dinâmica de edição mínima
  entre as palavras lidas e o texto esperado, com **fim livre no texto** (a leitura para antes do
  fim sem custo). Classificação:
  - correspondência → **correta**;
  - substituição → **trocada** (guarda o que foi dito);
  - texto sem leitura → **pulada**;
  - leitura extra igual à palavra esperada anterior/seguinte → **repetição** (não é erro);
  - trocada seguida de extra igual à esperada → **autocorreção** (conta como correta);
  - outra leitura extra → **inserção** (não conta como erro para PCPM, só aparece);
  - pausa antes da palavra > 3 s → marca **hesitação longa** (informativo, não muda a contagem).
  PCPM = corretas × 60 / segundos lidos, onde segundos lidos = min(60, fim da última palavra).
- **Referências por ano:** tabela de Hasbrouck & Tindal (2017, percentil 50, fim do ano) usada
  como aproximação e rotulada assim nos dois idiomas: 1º ano 60, 2º 100, 3º 112, 4º 133, 5º 146.
- **Textos:** originais, escritos para o app (sem direitos de terceiros): pt — 1º, 2º, 3º, 4º ano;
  en — grade 2 e grade 4. 60–180 palavras, vocabulário do ano, sem números em algarismo.
- **Stack:** Next.js 16 (App Router), Tailwind 4, Vitest, `postgres` no mesmo Supabase do Sinal de
  Alarme (tabela nova), Vercel (projeto novo `fluente`). Visual e i18n no mesmo padrão do Sinal de
  Alarme (copiar a base de `~/dev/sinal-de-alarme` e remover o que é do domínio antigo).

## 4. Dados

`leituras`: `id uuid`, `idioma`, `texto_id`, `apelido`, `ano int`, `corretas int`,
`erros int`, `lidas int`, `segundos numeric`, `pcpm numeric`, `alinhamento jsonb`,
`palavras jsonb` (transcrição com tempos), `contagem_manual int null`, `ip_hash`, `criada_em`.
Sem áudio. `/estudo` exclui `lower(apelido) = 'teste'`. Limite: 30 leituras/h por IP.

## 5. Erros

Microfone negado → mensagem clara; gravação < 5 s → pede para repetir; transcrição falhou ou
sem palavras → mensagem e botão "tentar de novo"; áudio sem fala reconhecível → PCPM 0 com aviso.

## 6. Testes

Alinhamento coberto por testes unitários: leitura perfeita, parada no meio, palavra trocada,
pulada, repetição, autocorreção, hesitação, filtro de 60 s, acentos/pontuação, texto vazio.
Integração real: uma leitura gravada contra a API antes de liberar.

## 7. Fora do escopo

Login, turmas e professoras, histórico por aluno entre dias, leitura ao vivo, voz sintética.
