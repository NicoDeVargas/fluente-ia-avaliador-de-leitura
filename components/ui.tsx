import Link from "next/link";
import { BookOpenText } from "@phosphor-icons/react/dist/ssr";

export const primario =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-acento px-5 py-3 font-semibold text-white transition active:scale-[0.98] hover:bg-acento-forte disabled:opacity-50 disabled:active:scale-100";
export const secundario =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-linha bg-superficie px-5 py-3 font-semibold text-tinta transition active:scale-[0.98] hover:border-suave";

export function Marca({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 font-display text-lg font-semibold tracking-tight">
      <BookOpenText size={22} weight="bold" className="text-acento-texto" aria-hidden />
      Fluente
    </Link>
  );
}

export function Topo({ href, children }: { href?: string; children?: React.ReactNode }) {
  return (
    <header className="border-b border-linha">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <Marca href={href} />
        {children}
      </div>
    </header>
  );
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-acento/40 bg-acento-suave px-4 py-3 text-sm text-acento-texto">{children}</p>;
}
