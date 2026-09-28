import { describe, expect, it } from "vitest";
import { contarSilabas } from "@/lib/silabas";

describe("contarSilabas", () => {
  it("português", () => {
    expect(contarSilabas("casa", "pt")).toBe(2);
    expect(contarSilabas("borboleta", "pt")).toBe(4);
    expect(contarSilabas("pássaro", "pt")).toBe(3);
    expect(contarSilabas("ônibus", "pt")).toBe(3);
    expect(contarSilabas("água", "pt")).toBe(2);
    expect(contarSilabas("saída", "pt")).toBe(3);
    expect(contarSilabas("poeta", "pt")).toBe(3);
    expect(contarSilabas("leão", "pt")).toBe(2);
    expect(contarSilabas("queijo", "pt")).toBe(2);
    expect(contarSilabas("guarda-chuva", "pt")).toBe(4);
    expect(contarSilabas("Pássaro,", "pt")).toBe(3);
  });

  it("inglês", () => {
    expect(contarSilabas("garden", "en")).toBe(2);
    expect(contarSilabas("butterfly", "en")).toBe(3);
    expect(contarSilabas("cake", "en")).toBe(1);
    expect(contarSilabas("little", "en")).toBe(2);
    expect(contarSilabas("yes", "en")).toBe(1);
    expect(contarSilabas("the", "en")).toBe(1);
  });

  it("nunca é zero para uma palavra", () => {
    expect(contarSilabas("pst", "pt")).toBe(1);
    expect(contarSilabas("hmm", "en")).toBe(1);
  });
});
