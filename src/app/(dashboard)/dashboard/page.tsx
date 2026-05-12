"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Bell, DollarSign, UserPlus, CheckCircle, CalendarCheck, Target } from "lucide-react";
import { Contact, Activity, Deal, Sale, Expense, Voucher, WeeklyKPI } from "@/types";
import { formatCurrency, CONTACT_STATUS_COLORS, CONTACT_STATUS_LABELS, DEAL_STAGE_LABELS } from "@/lib/utils";

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  iconBg: string;
}

function StatCard({ icon, label, value, sub, accent, iconBg }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${accent} p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`p-2.5 rounded-xl ${iconBg} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none mb-1.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [kpis, setKpis] = useState<WeeklyKPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.ok ? r.json() : []),
      fetch("/api/activities").then((r) => r.ok ? r.json() : []),
      fetch("/api/deals").then((r) => r.ok ? r.json() : []),
      fetch("/api/sales").then((r) => r.ok ? r.json() : []),
      fetch("/api/expenses").then((r) => r.ok ? r.json() : []),
      fetch("/api/vouchers").then((r) => r.ok ? r.json() : []),
      fetch("/api/kpis").then((r) => r.ok ? r.json() : []),
    ]).then(([c, a, d, s, e, v, k]) => {
      setContacts(Array.isArray(c) ? c : []);
      setActivities(Array.isArray(a) ? a : []);
      setDeals(Array.isArray(d) ? d : []);
      setSales(Array.isArray(s) ? s : []);
      setExpenses(Array.isArray(e) ? e : []);
      setVouchers(Array.isArray(v) ? v : []);
      setKpis(Array.isArray(k) ? k : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newThisMonth = contacts.filter((c) => c.createdAt?.startsWith(thisMonth)).length;

  const monthCommissions = sales
    .filter((s) => {
      const d = s.saleDate || s.createdAt || "";
      return d.startsWith(thisMonth) && s.status.toLowerCase().includes("emitid");
    })
    .reduce((sum, s) => sum + s.commission, 0);
  const monthExpTotal = expenses
    .filter((e) => e.month === thisMonth)
    .reduce((sum, e) => sum + e.amount, 0);
  const monthNet = monthCommissions - monthExpTotal;
  const pendingFollowUps = activities.filter((a) => a.status === "pendiente").length;
  const activeDeals = deals.filter((d) => !["cerrado_ganado", "cerrado_perdido"].includes(d.stage));
  const closedWon = deals.filter((d) => d.stage === "cerrado_ganado");
  const totalRevenue = closedWon.reduce((s, d) => s + d.amount, 0);
  const pipeline = activeDeals.reduce((s, d) => s + d.amount * (d.probability / 100), 0);

  const recentContacts = [...contacts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const upcomingFollowUps = activities
    .filter((a) => a.status === "pendiente" && a.nextFollowUp)
    .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp))
    .slice(0, 5);

  const today = now.toISOString().slice(0, 10);
  const upcomingTrips = vouchers
    .filter((v) => v.checkIn && v.checkIn >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .slice(0, 4);

  const weekStart = (() => {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return d.toISOString().slice(0, 10);
  })();
  const weekKPI = kpis.find((k) => k.weekStart === weekStart);
  const KPI_SUMMARY = [
    { key: "bni11s" as keyof WeeklyKPI,       label: "BNI 1-a-1s",   target: 8  },
    { key: "cotizaciones" as keyof WeeklyKPI, label: "Cotizaciones", target: 3  },
    { key: "cierres" as keyof WeeklyKPI,      label: "Cierres",      target: 1  },
    { key: "presenciales" as keyof WeeklyKPI, label: "Presenciales", target: 5  },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-[#3c93d6] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 min-h-full bg-slate-50/60">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#3c93d6] uppercase tracking-widest mb-1.5">
          {now.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Resumen general · Hoy Viajo CRM</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Users size={18} className="text-[#3c93d6]" />}
          label="Total Contactos"
          value={contacts.length}
          sub={`+${newThisMonth} este mes`}
          accent="border-l-[#3c93d6]"
          iconBg="bg-[#ddeef9]"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-purple-600" />}
          label="Deals Activos"
          value={activeDeals.length}
          sub={`Pipeline: ${formatCurrency(pipeline)}`}
          accent="border-l-purple-500"
          iconBg="bg-purple-50"
        />
        <StatCard
          icon={<Bell size={18} className="text-orange-500" />}
          label="Follow-ups Pendientes"
          value={pendingFollowUps}
          accent="border-l-orange-400"
          iconBg="bg-orange-50"
        />
        <StatCard
          icon={<CheckCircle size={18} className="text-emerald-600" />}
          label="Clientes Activos"
          value={contacts.filter((c) => c.status === "cliente").length}
          accent="border-l-emerald-500"
          iconBg="bg-emerald-50"
        />
        <StatCard
          icon={<UserPlus size={18} className="text-cyan-600" />}
          label="Nuevos este Mes"
          value={newThisMonth}
          accent="border-l-cyan-500"
          iconBg="bg-cyan-50"
        />
        <StatCard
          icon={<DollarSign size={18} className="text-green-600" />}
          label="Deals Cerrados"
          value={formatCurrency(totalRevenue)}
          sub={`${closedWon.length} ganados`}
          accent="border-l-green-500"
          iconBg="bg-green-50"
        />
      </div>

      {/* ── Financial snapshot ── */}
      <div className="mb-8 bg-gradient-to-r from-[#1a3a5c] to-[#2d6da3] rounded-2xl p-6 shadow-lg">
        <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-5">
          Resultado financiero · {now.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-300 mb-1">Comisiones</p>
            <p className="text-2xl font-bold text-green-300">{fmtCLP(monthCommissions)}</p>
          </div>
          <div className="border-x border-white/20 px-4">
            <p className="text-xs text-blue-300 mb-1">Gastos registrados</p>
            <p className="text-2xl font-bold text-red-300">{fmtCLP(monthExpTotal)}</p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-blue-300 mb-1">Resultado neto</p>
            <p className={`text-2xl font-bold ${monthNet >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {fmtCLP(monthNet)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Contactos recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[#3c93d6] inline-block flex-shrink-0" />
            Contactos Recientes
          </h2>
          {recentContacts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay contactos aún</p>
          ) : (
            <div className="space-y-1">
              {recentContacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#ddeef9] text-[#3c93d6] flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.company || c.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${CONTACT_STATUS_COLORS[c.status]}`}>
                    {CONTACT_STATUS_LABELS[c.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-ups */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-orange-400 inline-block flex-shrink-0" />
            Próximos Follow-ups
          </h2>
          {upcomingFollowUps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay follow-ups pendientes</p>
          ) : (
            <div className="space-y-1">
              {upcomingFollowUps.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center flex-shrink-0">
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.contactName}</p>
                    <p className="text-xs text-gray-400 truncate">{a.notes || a.type}</p>
                  </div>
                  <p className="text-xs font-medium text-orange-500 whitespace-nowrap flex-shrink-0">
                    {a.nextFollowUp ? new Date(a.nextFollowUp + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deals por etapa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 xl:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500 inline-block flex-shrink-0" />
            Deals por Etapa
          </h2>
          {deals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay deals registrados</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(DEAL_STAGE_LABELS).map(([stage, label]) => {
                const count = deals.filter((d) => d.stage === stage).length;
                const value = deals.filter((d) => d.stage === stage).reduce((s, d) => s + d.amount, 0);
                return (
                  <div key={stage} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-gray-500 mb-1 leading-snug">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(value)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximos viajes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarCheck size={16} className="text-blue-500" />
            Próximos Viajes
          </h2>
          {upcomingTrips.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay viajes próximos</p>
          ) : (
            <div className="space-y-1">
              {upcomingTrips.map((v) => {
                const checkInDate = new Date(v.checkIn + "T12:00:00");
                return (
                  <div key={v.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex flex-col items-center justify-center flex-shrink-0 border border-blue-100">
                      <span className="text-sm font-bold leading-none">{checkInDate.getDate()}</span>
                      <span className="text-[10px] uppercase text-blue-400 leading-none mt-0.5">
                        {checkInDate.toLocaleDateString("es-CL", { month: "short" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{v.contactName}</p>
                      <p className="text-xs text-gray-400 truncate">{v.description || v.fileName}</p>
                    </div>
                    {v.checkOut && (
                      <p className="text-xs text-gray-400 flex-shrink-0">→ {v.checkOut}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly KPIs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Target size={16} className="text-purple-500" />
            Actividad esta semana
          </h2>
          {!weekKPI ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin registrar — ve a Marketing → KPIs</p>
          ) : (
            <div className="space-y-4 mt-4">
              {KPI_SUMMARY.map(({ key, label, target }) => {
                const value = Number(weekKPI[key]) || 0;
                const pct = Math.min((value / target) * 100, 100);
                const color = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-[#3c93d6]" : pct >= 30 ? "bg-yellow-400" : "bg-gray-200";
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className={pct >= 100 ? "font-bold text-emerald-600" : "font-semibold text-gray-500"}>
                        {value}<span className="text-gray-400 font-normal">/{target}</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
