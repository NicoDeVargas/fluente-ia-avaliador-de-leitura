import "server-only";
import type { PalavraLida } from "@/lib/alinhar";

const BASE = "https://api.assemblyai.com/v2";
const POLL_MS = 700;
const TIMEOUT_MS = 60000;

export async function transcrever(audio: ArrayBuffer, idioma: "pt" | "en"): Promise<PalavraLida[]> {
  const chave = process.env.ASSEMBLYAI_API_KEY;
  if (!chave) throw new Error("ASSEMBLYAI_API_KEY não definido");

  const upload = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: { authorization: chave, "content-type": "application/octet-stream" },
    body: audio,
  });
  if (!upload.ok) throw new Error("falha no upload do áudio");
  const { upload_url } = await upload.json();

  const criacao = await fetch(`${BASE}/transcript`, {
    method: "POST",
    headers: { authorization: chave, "content-type": "application/json" },
    body: JSON.stringify({
      audio_url: upload_url,
      speech_models: ["universal-3-5-pro"],
      language_code: idioma,
      disfluencies: true,
    }),
  });
  if (!criacao.ok) throw new Error("falha ao criar transcrição");
  const { id } = await criacao.json();

  const inicio = Date.now();
  while (Date.now() - inicio < TIMEOUT_MS) {
    const status = await fetch(`${BASE}/transcript/${id}`, { headers: { authorization: chave } });
    if (!status.ok) throw new Error("falha ao consultar transcrição");
    const dados = await status.json();
    if (dados.status === "completed") {
      const palavras: { text: string; start: number; end: number }[] = dados.words ?? [];
      return palavras.map((p) => ({ texto: p.text, inicio: p.start, fim: p.end }));
    }
    if (dados.status === "error") throw new Error(dados.error ?? "transcrição falhou");
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error("tempo esgotado na transcrição");
}
