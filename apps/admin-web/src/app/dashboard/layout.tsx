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
    <div className="flex min-h-screen bg-neutral-950 text-white">
      <aside className="w-56 shrink-0 border-r border-neutral-800 p-4">
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
        <div className="mt-8 px-2">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
