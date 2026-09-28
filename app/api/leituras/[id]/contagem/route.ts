import { z } from "zod";
import { sql } from "@/lib/db";

const Corpo = z.object({ contagem: z.number().int().min(0).max(400) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const [leitura] = await sql`select id from leituras where id = ${id}`;
  if (!leitura) return Response.json({ erro: "leitura não encontrada" }, { status: 404 });
  await sql`update leituras set contagem_manual = ${corpo.data.contagem} where id = ${id}`;
  return new Response(null, { status: 204 });
}
