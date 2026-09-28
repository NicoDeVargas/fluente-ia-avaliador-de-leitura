export interface Par {
  app: number;
  humano: number;
}

export function diferencaMediaAbsoluta(pares: Par[]): number | null {
  if (pares.length === 0) return null;
  return pares.reduce((s, p) => s + Math.abs(p.app - p.humano), 0) / pares.length;
}

export function fracaoDentro(pares: Par[], limite: number): number | null {
  if (pares.length === 0) return null;
  return pares.filter((p) => Math.abs(p.app - p.humano) <= limite).length / pares.length;
}

export function pearson(pares: Par[]): number | null {
  const n = pares.length;
  if (n < 2) return null;
  const mx = pares.reduce((s, p) => s + p.app, 0) / n;
  const my = pares.reduce((s, p) => s + p.humano, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of pares) {
    const dx = p.app - mx;
    const dy = p.humano - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}
