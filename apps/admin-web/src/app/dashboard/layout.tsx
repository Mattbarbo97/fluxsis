import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard/estoque", label: "Estoque" },
  { href: "/dashboard/pedidos", label: "Pedidos" },
  { href: "/dashboard/clientes", label: "Clientes" },
  { href: "/dashboard/entregas", label: "Entregas" },
  { href: "/dashboard/mensagens", label: "Mensagens" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-white">
      <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-neutral-800 p-4">
        <div className="mb-6 px-2 text-lg font-semibold">FluxSis</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-8">
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
