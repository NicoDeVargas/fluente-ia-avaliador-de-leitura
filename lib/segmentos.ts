import { normalizar } from "@/lib/alinhar";

export type Segmento = { tipo: "palavra"; indice: number; antes: string; nucleo: string; depois: string } | { tipo: "resto"; texto: string };

export function segmentar(corpo: string): Segmento[] {
  const saida: Segmento[] = [];
  let indice = 0;
  for (const parte of corpo.trim().split(/(\s+)/)) {
    if (/^\s+$/.test(parte)) {
      saida.push({ tipo: "resto", texto: " " });
      continue;
    }
    for (const pedaco of parte.split(/(?<=[–—])/)) {
      if (normalizar(pedaco) === "") {
        saida.push({ tipo: "resto", texto: pedaco });
        continue;
      }
      const [, antes, nucleo, depois] = pedaco.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u)!;
      saida.push({ tipo: "palavra", indice: indice++, antes, nucleo, depois });
    }
  }
  return saida;
}
