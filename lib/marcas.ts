import type { Marca } from "@/lib/alinhar";

export const ESTILO: Record<Marca, string> = {
  correta: "",
  trocada: "text-erro underline decoration-erro decoration-wavy decoration-[1.5px] underline-offset-[7px]",
  pulada: "text-erro line-through decoration-erro decoration-2",
  autocorrecao: "text-ok underline decoration-ok decoration-dotted decoration-[3px] underline-offset-[7px]",
  nao_lida: "text-apagado",
};

export const ESTILO_SILABADA = "rounded-md bg-pausa-suave px-0.5 tracking-[0.14em] shadow-[inset_0_-2px_0_var(--pausa)]";
