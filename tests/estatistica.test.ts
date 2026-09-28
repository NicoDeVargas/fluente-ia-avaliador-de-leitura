import { describe, expect, it } from "vitest";
import { diferencaMediaAbsoluta, fracaoDentro, pearson } from "@/lib/estatistica";

const pares = [
  { app: 50, humano: 52 },
  { app: 80, humano: 80 },
  { app: 30, humano: 25 },
  { app: 100, humano: 96 },
];

describe("estatística", () => {
  it("diferença média absoluta", () => {
    expect(diferencaMediaAbsoluta(pares)).toBe(2.75);
  });

  it("fração dentro de ±3", () => {
    expect(fracaoDentro(pares, 3)).toBe(0.5);
  });

  it("inclui o limite exato", () => {
    expect(fracaoDentro([{ app: 10, humano: 13 }], 3)).toBe(1);
  });

  it("pearson perfeito e inverso", () => {
    expect(
      pearson([
        { app: 1, humano: 2 },
        { app: 2, humano: 4 },
        { app: 3, humano: 6 },
      ]),
    ).toBeCloseTo(1);
    expect(
      pearson([
        { app: 1, humano: 3 },
        { app: 2, humano: 2 },
        { app: 3, humano: 1 },
      ]),
    ).toBeCloseTo(-1);
  });

  it("pearson de valores conhecidos", () => {
    expect(pearson(pares)).toBeCloseTo(0.9944, 4);
  });

  it("pearson exige ao menos três pares", () => {
    expect(
      pearson([
        { app: 1, humano: 2 },
        { app: 2, humano: 4 },
      ]),
    ).toBeNull();
  });

  it("sem dados ou sem variância", () => {
    expect(diferencaMediaAbsoluta([])).toBeNull();
    expect(fracaoDentro([], 3)).toBeNull();
    expect(pearson([{ app: 1, humano: 1 }])).toBeNull();
    expect(
      pearson([
        { app: 5, humano: 1 },
        { app: 5, humano: 2 },
        { app: 5, humano: 3 },
      ]),
    ).toBeNull();
  });
});
