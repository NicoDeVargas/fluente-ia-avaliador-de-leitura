import { z } from "zod";
import { sql } from "@/lib/db";
import { hashIp } from "@/lib/ip";
import { transcrever } from "@/lib/transcrever";
import { alinhar } from "@/lib/alinhar";
import { classificar } from "@/lib/classificacao";
import { TEXTOS } from "@/lib/textos";
import { MAX_INSTRUCOES, TIPOS_INSTRUCAO, gabaritoDoRoteiro, palavrasDoTexto, ultimoAlcancado } from "@/lib/roteiro";

export const maxDuration = 60;

const Campos = z.object({
  textoId: z.string().min(1),
  apelido: z.string().trim().min(1).max(40),
  ano: z.coerce.number().int().min(1).max(5),
  idioma: z.enum(["pt", "en"]),
});

const Roteiro = z
  .array(
    z.object({
      tipo: z.enum(TIPOS_INSTRUCAO),
      indice: z.number().int().min(0),
      fim: z.number().int().min(0),
      dizer: z.string().trim().min(1).max(40).optional(),
    }),
  )
  .min(1)
  .max(MAX_INSTRUCOES);

function lerRoteiro(valor: FormDataEntryValue | null) {
  if (valor === null || valor === "") return { ok: true as const, roteiro: null };
  if (typeof valor !== "string") return { ok: false as const };
  let json: unknown;
  try {
    json = JSON.parse(valor);
  } catch {
    return { ok: false as const };
  }
  const r = Roteiro.safeParse(json);
  return r.success ? { ok: true as const, roteiro: r.data } : { ok: false as const };
}

const TAMANHO_MAXIMO = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const forma = await request.formData().catch(() => null);
  if (!forma) return Response.json({ erro: "dados inválidos" }, { status: 400 });

  const campos = Campos.safeParse({
    textoId: forma.get("textoId"),
    apelido: forma.get("apelido"),
    ano: forma.get("ano"),
    idioma: forma.get("idioma"),
  });
  if (!campos.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });

  const audio = forma.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return Response.json({ erro: "áudio inválido" }, { status: 400 });
  if (audio.size > TAMANHO_MAXIMO) return Response.json({ erro: "áudio muito grande" }, { status: 400 });

  const texto = TEXTOS.find((t) => t.id === campos.data.textoId && t.idioma === campos.data.idioma);
  if (!texto) return Response.json({ erro: "texto não encontrado" }, { status: 404 });

  const lido = lerRoteiro(forma.get("roteiro"));
  const total = palavrasDoTexto(texto.corpo).length;
  if (!lido.ok || lido.roteiro?.some((i) => i.fim < i.indice || i.fim >= total)) return Response.json({ erro: "roteiro inválido" }, { status: 400 });
  const roteiro = lido.roteiro;

  const ipHash = hashIp(request);
  const [{ recentes }] = await sql<{ recentes: number }[]>`
    select count(*)::int as recentes from leituras where ip_hash = ${ipHash} and criada_em > now() - interval '1 hour'`;
  if (recentes >= 30) return Response.json({ erro: "muitas leituras, tente mais tarde" }, { status: 429 });

  let palavras;
  try {
    palavras = await transcrever(await audio.arrayBuffer(), campos.data.idioma);
  } catch {
    return Response.json({ erro: "falha na transcrição" }, { status: 502 });
  }

  const resultado = alinhar(texto.corpo, palavras, campos.data.idioma);
  const { nivel } = classificar(resultado, campos.data.ano, campos.data.idioma);
  const gabarito = roteiro ? gabaritoDoRoteiro(roteiro, texto.corpo, ultimoAlcancado(resultado)) : null;

  const [{ id }] = await sql<{ id: string }[]>`
    insert into leituras (idioma, texto_id, apelido, ano, corretas, erros, lidas, segundos, pcpm, silabadas, nivel, alinhamento, palavras, roteiro, gabarito, ip_hash)
    values (
      ${campos.data.idioma}, ${campos.data.textoId}, ${campos.data.apelido}, ${campos.data.ano},
      ${resultado.corretas}, ${resultado.erros}, ${resultado.lidas}, ${resultado.segundos}, ${resultado.pcpm}, ${resultado.silabadas}, ${nivel},
      ${sql.json(JSON.parse(JSON.stringify(resultado)))}, ${sql.json(JSON.parse(JSON.stringify(palavras)))},
      ${roteiro ? sql.json(JSON.parse(JSON.stringify(roteiro))) : null}, ${gabarito ? sql.json(JSON.parse(JSON.stringify(gabarito))) : null}, ${ipHash}
    ) returning id`;

  return Response.json({ id, resultado, palavras, roteiro, gabarito }, { status: 201 });
}
