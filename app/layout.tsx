import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const texto = Atkinson_Hyperlegible_Next({
  variable: "--fonte-texto",
  subsets: ["latin", "latin-ext"],
});

const titulo = Bricolage_Grotesque({
  variable: "--fonte-titulo",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  title: "Fluente",
  description: "Measure a child's reading fluency in words correct per minute from one minute of reading aloud.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#111417" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${texto.variable} ${titulo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
