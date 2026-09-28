type Idioma = "pt" | "en";

const VOGAIS_PT = "aeiouáéíóúâêôãõàü";
const FORTES_PT = "aeoáéóâêôãõà";
const TONICAS_PT = "íú";
const NASAIS_PT = "ãõ";

function silabasPt(palavra: string) {
  let n = 0;
  for (let k = 0; k < palavra.length; k++) {
    const c = palavra[k];
    if (!VOGAIS_PT.includes(c)) continue;
    const a = palavra[k - 1];
    if (!a || !VOGAIS_PT.includes(a)) {
      n++;
      continue;
    }
    const hiato = (FORTES_PT.includes(a) && FORTES_PT.includes(c) && !(NASAIS_PT.includes(a) && "oe".includes(c))) || TONICAS_PT.includes(a) || TONICAS_PT.includes(c);
    if (hiato) n++;
  }
  return n;
}

function silabasEn(palavra: string) {
  const grupos = palavra.match(/^y?[aeiou]+|(?<=.)[aeiouy]+/g)?.length ?? 0;
  const muda = /[^aeiouy]e$/.test(palavra) && !/[^aeiouy]le$/.test(palavra) && grupos > 1;
  return grupos - (muda ? 1 : 0);
}

export function contarSilabas(palavra: string, idioma: Idioma): number {
  const partes = palavra.toLowerCase().normalize("NFC").split(/[^\p{L}]+/u).filter(Boolean);
  const total = partes.reduce((soma, p) => soma + (idioma === "pt" ? silabasPt(p) : silabasEn(p)), 0);
  return Math.max(1, total);
}
