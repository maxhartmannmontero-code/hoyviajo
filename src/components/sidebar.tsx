"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Kanban, FileText, Megaphone,
  TrendingUp, LogOut, Receipt, GitCompare, SendHorizonal, FileBadge, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavChild = { href: string; label: string; icon: React.ElementType };
type NavItem  = { href: string; label: string; icon: React.ElementType; children?: NavChild[] };

const navMain: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts",  label: "Contactos", icon: Users           },
  { href: "/pipeline",  label: "Pipeline",  icon: Kanban          },
  { href: "/sales",     label: "Ventas",    icon: TrendingUp      },
  { href: "/reportes",  label: "Reportes",  icon: BarChart2       },
];

const navOps: NavItem[] = [
  { href: "/gastos",        label: "Finanzas",     icon: Receipt    },
  { href: "/conciliacion",  label: "Conciliación", icon: GitCompare },
  {
    href: "/marketing", label: "Marketing", icon: Megaphone,
    children: [{ href: "/mailing", label: "Mailing", icon: SendHorizonal }],
  },
  { href: "/vouchers", label: "Vouchers", icon: FileText  },
  { href: "/facturas", label: "Facturas", icon: FileBadge },
];

function NavGroup({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <div className="space-y-0.5">
      {items.map(({ href, label, icon: Icon, children }) => {
        const childActive = children?.some(c => pathname === c.href || pathname.startsWith(c.href + "/"));
        const active      = !childActive && (pathname === href || pathname.startsWith(href + "/"));
        const expanded    = active || childActive;

        return (
          <div key={href}>
            <Link
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-white/[0.09] text-white"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              )}
            >
              <span className={cn(
                "w-[3px] h-[18px] rounded-full flex-shrink-0 transition-all duration-300",
                active ? "bg-[#ACFD46]" : "bg-transparent"
              )} />
              <Icon
                size={16}
                className={cn(
                  "flex-shrink-0 transition-colors duration-200",
                  active       ? "text-[#ACFD46]"
                  : childActive ? "text-white/60"
                  : "text-white/40 group-hover:text-white/65"
                )}
              />
              <span className="flex-1 tracking-[0.01em]">{label}</span>
            </Link>

            {children && expanded && (
              <div className="ml-[3.35rem] mt-0.5 mb-1 border-l border-white/[0.08] pl-3 space-y-0.5">
                {children.map(({ href: cHref, label: cLabel, icon: CIcon }) => {
                  const cActive = pathname === cHref || pathname.startsWith(cHref + "/");
                  return (
                    <Link
                      key={cHref}
                      href={cHref}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                        cActive
                          ? "text-white bg-white/[0.08]"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                      )}
                    >
                      <CIcon size={12} className={cActive ? "text-[#ACFD46]" : ""} />
                      {cLabel}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const initials = session?.user?.name?.split(" ").map(w => w[0]).slice(0, 2).join("") ?? "U";

  return (
    <aside className="relative flex flex-col w-64 min-h-screen text-white overflow-hidden flex-shrink-0">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(175deg, #091525 0%, #0D1C35 60%, #091525 100%)" }}
      />
      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(172,253,70,0.2) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Top shimmer line */}
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#ACFD46]/20 to-transparent" />

      {/* Content */}
      <div className="relative flex flex-col h-full">

        {/* Logo */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <img
            src="/400x200.png"
            alt="Hoy Viajo"
            className="h-7 w-auto object-contain brightness-0 invert"
          />
          <span className="text-[9px] font-semibold text-[#ACFD46] tracking-[0.22em] uppercase border border-[#ACFD46]/25 px-1.5 py-[3px] rounded-[4px] bg-[#ACFD46]/[0.07]">
            CRM
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          <div>
            <p className="px-3 mb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/20">
              Principal
            </p>
            <NavGroup items={navMain} pathname={pathname} />
          </div>
          <div>
            <p className="px-3 mb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/20">
              Operaciones
            </p>
            <NavGroup items={navOps} pathname={pathname} />
          </div>
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-white/[0.06]">
          {session?.user && (
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="relative flex-shrink-0">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full ring-2 ring-[#ACFD46]/35 ring-offset-1 ring-offset-[#091525]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#ACFD46]/15 ring-2 ring-[#ACFD46]/35 ring-offset-1 ring-offset-[#091525] flex items-center justify-center text-[#ACFD46] text-xs font-bold">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#ACFD46] border-2 border-[#091525]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-white/90 truncate leading-tight">
                  {session.user.name}
                </p>
                <p className="text-[11px] text-white/30 truncate leading-tight mt-0.5">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-white/30 hover:text-white/65 hover:bg-white/[0.05] rounded-xl transition-all duration-200"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
