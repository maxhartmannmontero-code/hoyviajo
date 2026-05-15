"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Kanban, FileText, Megaphone,
  TrendingUp, LogOut, ChevronRight, Receipt, GitCompare, SendHorizonal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/contacts",  label: "Contactos",  icon: Users           },
  { href: "/pipeline",  label: "Pipeline",   icon: Kanban          },
  { href: "/sales",     label: "Ventas",     icon: TrendingUp      },
  { href: "/gastos",         label: "Finanzas",       icon: Receipt     },
  { href: "/conciliacion",   label: "Conciliación",   icon: GitCompare  },
  { href: "/marketing",      label: "Marketing",      icon: Megaphone   },
  { href: "/vouchers",  label: "Vouchers",   icon: FileText        },
  { href: "/mailing",   label: "Mailing",    icon: SendHorizonal   },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#1a2e4a] text-white">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#243859]">
        <img src="/400x200.png" alt="Hoy Viajo" className="h-8 w-auto object-contain" />
        <span className="text-xs text-white/50 font-medium tracking-widest uppercase">CRM</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white border-l-2 border-[#acfd46] pl-[10px]"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} className={active ? "text-[#acfd46]" : ""} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-[#acfd46]" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#243859]">
        {session?.user && (
          <div className="flex items-center gap-3 mb-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
