"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/customer", label: "Customer 360" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/audit", label: "Audit & Compliance" },
  { href: "/copilot", label: "RM Co-pilot" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-ink text-cream border-r-4 border-ink flex flex-col">
      <Link href="/" className="block px-5 py-6 border-b-4 border-cream/10">
        <div className="font-display font-bold text-xl leading-none">MIA</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-gold mt-1">Wealth Console</div>
      </Link>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-2">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t-4 border-cream/10 text-[10px] text-cream/50">
        Demo customer: Rahul Verma
      </div>
    </aside>
  );
}
