"use client";

import { useSyncExternalStore } from "react";

export interface Leitor {
  apelido: string;
  ano: number;
}

const CHAVE = "fluente:leitor";
const ouvintes = new Set<() => void>();

function bruto() {
  try {
    return sessionStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function salvarLeitor(leitor: Leitor) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(leitor));
  } catch {}
  ouvintes.forEach((f) => f());
}

function inscrever(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function useLeitor(): Leitor | null {
  const valor = useSyncExternalStore(inscrever, bruto, () => null);
  if (!valor) return null;
  try {
    const l = JSON.parse(valor) as Leitor;
    return typeof l.apelido === "string" && l.apelido.trim() && l.ano >= 1 && l.ano <= 5 ? l : null;
  } catch {
    return null;
  }
}
