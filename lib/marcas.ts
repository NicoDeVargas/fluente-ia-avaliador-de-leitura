import type { Marca } from "@/lib/alinhar";

export const ESTILO: Record<Marca, string> = {
  correta: "",
  trocada: "text-erro underline decoration-erro decoration-wavy decoration-[1.5px] underline-offset-[7px]",
  pulada: "text-erro line-through decoration-erro decoration-2",
  autocorrecao: "text-ok underline decoration-ok decoration-dotted decoration-[3px] underline-offset-[7px]",
  nao_lida: "text-apagado",
};
