import { describe, expect, it } from "vitest";
import { TEXTOS, sortearTexto } from "@/lib/textos";
import { tokenizar } from "@/lib/alinhar";

const FAIXAS: Record<number, [number, number]> = { 1: [50, 70], 2: [80, 100], 3: [110, 130], 4: [140, 160], 5: [160, 190] };

function semente(n: number) {
  let s = n;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe("textos", () => {
  it("tem textos suficientes por ano e idioma", () => {
    for (const ano of [1, 2, 3, 4, 5]) {
      expect(TEXTOS.filter((t) => t.idioma === "pt" && t.ano === ano).length).toBeGreaterThanOrEqual(3);
      expect(TEXTOS.filter((t) => t.idioma === "en" && t.ano === ano).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("respeita o tamanho de cada ano", () => {
    for (const t of TEXTOS) {
      const [min, max] = FAIXAS[t.ano];
      const n = tokenizar(t.corpo).length;
      expect(n, t.id).toBeGreaterThanOrEqual(min);
      expect(n, t.id).toBeLessThanOrEqual(max);
    }
  });

  it("não tem algarismos e os ids são únicos", () => {
    for (const t of TEXTOS) expect(/\d/.test(t.titulo + t.corpo), t.id).toBe(false);
    expect(new Set(TEXTOS.map((t) => t.id)).size).toBe(TEXTOS.length);
  });
});

describe("sortearTexto", () => {
  it("sorteia do idioma e ano pedidos", () => {
    const aleatorio = semente(7);
    for (let i = 0; i < 50; i++) {
      const t = sortearTexto("pt", 3, undefined, aleatorio);
      expect(t?.idioma).toBe("pt");
      expect(t?.ano).toBe(3);
    }
  });

  it("evita o texto excluído", () => {
    const aleatorio = semente(42);
    for (let i = 0; i < 50; i++) expect(sortearTexto("en", 2, "lost-kite", aleatorio)?.id).not.toBe("lost-kite");
  });

  it("é determinístico com a mesma semente e cobre todas as opções", () => {
    const a = semente(3);
    const b = semente(3);
    const vistos = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const x = sortearTexto("pt", 5, undefined, a)?.id;
      expect(sortearTexto("pt", 5, undefined, b)?.id).toBe(x);
      vistos.add(x!);
    }
    expect(vistos.size).toBe(TEXTOS.filter((t) => t.idioma === "pt" && t.ano === 5).length);
  });

  it("usa o limite inferior e superior do gerador", () => {
    const doAno = TEXTOS.filter((t) => t.idioma === "pt" && t.ano === 1);
    expect(sortearTexto("pt", 1, undefined, () => 0)?.id).toBe(doAno[0].id);
    expect(sortearTexto("pt", 1, undefined, () => 0.999)?.id).toBe(doAno[doAno.length - 1].id);
  });

  it("devolve undefined quando não há texto", () => {
    expect(sortearTexto("pt", 9)).toBeUndefined();
  });
});
