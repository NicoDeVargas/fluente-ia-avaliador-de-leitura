import Link from "next/link";
import { BookOpenText, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { sufixo, textos, type Idioma } from "@/lib/i18n";

export const primario =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-acento px-5 py-3 font-semibold text-white transition hover:bg-acento-forte active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
export const secundario =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-linha bg-superficie px-5 py-3 font-semibold text-tinta transition hover:border-suave active:scale-[0.98]";
export const campo =
  "min-h-12 w-full rounded-xl border border-linha bg-papel px-4 text-base text-tinta transition placeholder:text-apagado hover:border-suave focus:border-acento focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-acento/35";

export function Marca({ idioma }: { idioma: Idioma }) {
  return (
    <Link href={`/${sufixo(idioma)}`} className="inline-flex min-h-11 items-center gap-2 font-display text-lg font-semibold tracking-tight">
      <BookOpenText size={24} weight="duotone" className="text-acento-texto" aria-hidden />
      Fluente
    </Link>
  );
}

export function SeletorIdioma({ idioma, caminho }: { idioma: Idioma; caminho: string }) {
  const t = textos[idioma];
  return (
    <nav aria-label={t.topo.idioma} className="flex rounded-xl border border-linha bg-superficie p-0.5 text-sm font-semibold">
      {(["en", "pt"] as Idioma[]).map((i) => (
        <Link
          key={i}
          href={`${caminho}${sufixo(i)}`}
          hrefLang={textos[i].lang}
          aria-current={i === idioma ? "true" : undefined}
          className={`inline-flex min-h-10 min-w-11 items-center justify-center rounded-[10px] px-2.5 uppercase ${
            i === idioma ? "bg-acento-suave text-acento-texto" : "text-suave hover:text-tinta"
          }`}
        >
          <span aria-hidden>{i}</span>
          <span className="sr-only">{textos[i].idiomas[i]}</span>
        </Link>
      ))}
    </nav>
  );
}

export function Topo({ idioma, children }: { idioma: Idioma; children?: React.ReactNode }) {
  return (
    <header className="border-b border-linha">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Marca idioma={idioma} />
        <div className="flex items-center gap-2 sm:gap-4">{children}</div>
      </div>
    </header>
  );
}

export function Aviso({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-erro/30 bg-erro-suave px-4 py-3.5 text-erro sm:flex-row sm:items-center">
      <p className="flex flex-1 gap-2.5 leading-snug">
        <WarningCircle size={22} weight="bold" className="mt-px shrink-0" aria-hidden />
        <span>{children}</span>
      </p>
      {acao}
    </div>
  );
}
