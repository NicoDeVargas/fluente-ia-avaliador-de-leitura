import { sql } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [leitura] = await sql`
    select id, idioma, texto_id, apelido, ano, corretas, erros, lidas, segundos, pcpm, alinhamento, palavras, contagem_manual, criada_em
    from leituras where id = ${id}`;
  if (!leitura) return Response.json({ erro: "leitura não encontrada" }, { status: 404 });
  return Response.json(leitura);
}
