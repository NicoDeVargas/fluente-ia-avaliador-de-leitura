import { describe, expect, it } from "vitest";
import { segmentar } from "@/lib/segmentos";
import { tokenizar } from "@/lib/alinhar";
import { TEXTOS } from "@/lib/textos";

describe("segmentar", () => {
  it("separa pontuação e mantém a palavra com hífen inteira", () => {
    const s = segmentar("Queriam vendê-la, então.");
    expect(s.filter((x) => x.tipo === "palavra").map((x) => x.tipo === "palavra" && [x.antes, x.nucleo, x.depois])).toEqual([
      ["", "Queriam", ""],
      ["", "vendê-la", ","],
      ["", "então", "."],
    ]);
    expect(s.map((x) => (x.tipo === "palavra" ? x.antes + x.nucleo + x.depois : x.texto)).join("")).toBe("Queriam vendê-la, então.");
  });

  it("numera como o alinhamento em todos os textos", () => {
    for (const t of TEXTOS) {
      expect(segmentar(t.corpo).filter((x) => x.tipo === "palavra").length).toBe(tokenizar(t.corpo).length);
    }
  });
});
