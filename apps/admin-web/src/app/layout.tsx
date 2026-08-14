import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FluxSis",
  description: "Painel de gestão FluxSis",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
