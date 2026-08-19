import type { Metadata, Viewport } from "next";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "FluxSis Entregador",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function EntregadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RegisterSW />
      {children}
    </>
  );
}
