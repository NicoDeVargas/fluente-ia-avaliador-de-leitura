import type { Idioma } from "@/lib/i18n";

export const gravacao: Record<Idioma, { aguardando: string; semFalaAviso: string }> = {
  en: {
    aguardando: "Start reading whenever you're ready",
    semFalaAviso: "We can't hear anything — check your microphone",
  },
  pt: {
    aguardando: "Comece a ler quando quiser",
    semFalaAviso: "Não estamos ouvindo nada — confira o microfone",
  },
};
