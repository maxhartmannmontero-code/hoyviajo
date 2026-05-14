"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, Bell, DollarSign, UserPlus, CheckCircle, CalendarCheck, Target, Globe, Trophy, Eye, EyeOff } from "lucide-react";
import { Contact, Activity, Deal, Sale, Expense, Voucher, WeeklyKPI } from "@/types";
import { formatCurrency, CONTACT_STATUS_COLORS, CONTACT_STATUS_LABELS } from "@/lib/utils";

const META = 4_000_000;

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
  const [gaData, setGaData] = useState<{ sessions: number; users: number } | null>(null);
  const [masked, setMasked] = useState(false);
  const hide = (v: string) => masked ? "••••••" : v;

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

  useEffect(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const start = `${thisMonth}-01`;
    const end = now.toISOString().slice(0, 10);
    fetch(`/api/analytics?start=${start}&end=${end}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data)) {
          const row = data.find((d) => d.month === thisMonth);
          if (row) setGaData({ sessions: Math.round(row.sessions), users: Math.round(row.activeUsers) });
        }
      })
      .catch(() => {});
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

  // Meta calculations
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const daysLeft = daysInMonth - daysPassed;
  const metaPct = Math.min((monthNet / META) * 100, 100);
  const expectedPct = (daysPassed / daysInMonth) * 100;
  const onTrack = metaPct >= expectedPct;
  const remaining = Math.max(META - monthNet, 0);
  const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
  const projected = daysPassed > 0 ? (monthNet / daysPassed) * daysInMonth : 0;

  // Deals closing this month
  const closingThisMonth = activeDeals
    .filter((d) => d.closeDate?.startsWith(thisMonth))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#3c93d6] uppercase tracking-widest mb-1.5">
            {now.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Resumen general · Hoy Viajo CRM</p>
        </div>
        <button
          onClick={() => setMasked((v) => !v)}
          className={`mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${masked ? "bg-gray-100 border-gray-200 text-gray-500" : "border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"}`}
        >
          {masked ? <EyeOff size={15} /> : <Eye size={15} />}
          {masked ? "Mostrar" : "Ocultar"}
        </button>
      </div>

      {/* ── META HERO ── */}
      <div className="mb-6 bg-gradient-to-r from-[#0f2744] to-[#1a4a7a] rounded-2xl p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-1">
              Meta mensual · {now.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
            </p>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-white">{hide(fmtCLP(monthNet))}</span>
              <span className="text-blue-300 text-lg mb-1">/ {hide(fmtCLP(META))}</span>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${onTrack ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${onTrack ? "bg-emerald-400" : "bg-red-400"}`} />
              {onTrack ? "En ritmo" : "Por debajo"}
            </div>
            <p className="text-blue-300 text-xs mt-2">{daysLeft} días restantes</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className={`h-3 rounded-full transition-all ${metaPct >= 100 ? "bg-emerald-400" : metaPct >= 75 ? "bg-[#3c93d6]" : metaPct >= 50 ? "bg-yellow-400" : metaPct >= 25 ? "bg-orange-400" : "bg-red-400"}`}
            style={{ width: `${Math.max(metaPct, 2)}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-blue-300 mb-0.5">Avance</p>
            <p className="text-lg font-bold text-white">{masked ? "••%" : `${metaPct.toFixed(0)}%`}</p>
          </div>
          <div>
            <p className="text-xs text-blue-300 mb-0.5">Falta</p>
            <p className="text-lg font-bold text-white">{remaining > 0 ? hide(fmtCLP(remaining)) : "¡Meta lograda!"}</p>
          </div>
          <div>
            <p className="text-xs text-blue-300 mb-0.5">Necesario/día</p>
            <p className="text-lg font-bold text-white">{dailyNeeded > 0 ? hide(fmtCLP(dailyNeeded)) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-blue-300 mb-0.5">Proyección</p>
            <p className={`text-lg font-bold ${projected >= META ? "text-emerald-300" : "text-orange-300"}`}>{hide(fmtCLP(projected))}</p>
          </div>
        </div>
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
          sub={`Pipeline: ${hide(formatCurrency(pipeline))}`}
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
          icon={<Trophy size={18} className="text-yellow-600" />}
          label="Comisiones del Mes"
          value={hide(fmtCLP(monthCommissions))}
          sub={`Gastos: ${hide(fmtCLP(monthExpTotal))}`}
          accent="border-l-yellow-400"
          iconBg="bg-yellow-50"
        />
        <StatCard
          icon={<DollarSign size={18} className="text-green-600" />}
          label="Deals Cerrados"
          value={hide(formatCurrency(totalRevenue))}
          sub={`${closedWon.length} ganados`}
          accent="border-l-green-500"
          iconBg="bg-green-50"
        />
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Deals cerrando este mes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500 inline-block flex-shrink-0" />
            Deals cerrando este mes
          </h2>
          {closingThisMonth.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay deals con cierre este mes</p>
          ) : (
            <div className="space-y-2">
              {closingThisMonth.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.dealName}</p>
                    <p className="text-xs text-gray-400 truncate">{d.contactName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-purple-600">{hide(formatCurrency(d.amount, d.currency))}</p>
                    <p className="text-xs text-gray-400">{d.probability}% prob.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-ups + GA4 */}
        <div className="flex flex-col gap-4">
          {/* GA4 mini */}
          <div className={`rounded-2xl border p-4 flex items-center gap-4 ${gaData ? "bg-white border-gray-100 shadow-sm" : "bg-slate-50 border-dashed border-slate-200"}`}>
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${gaData ? "bg-blue-50" : "bg-slate-100"}`}>
              <Globe size={18} className={gaData ? "text-blue-500" : "text-slate-400"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Visitas web este mes</p>
              {gaData ? (
                <div className="flex items-end gap-4 mt-1">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-none">{gaData.sessions.toLocaleString("es-CL")}</p>
                    <p className="text-xs text-gray-400 mt-0.5">sesiones</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-none">{gaData.users.toLocaleString("es-CL")}</p>
                    <p className="text-xs text-gray-400 mt-0.5">usuarios</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Sin datos GA4 aún</p>
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-orange-400 inline-block flex-shrink-0" />
              Próximos Follow-ups
            </h2>
            {upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay follow-ups pendientes</p>
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
        </div>

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

        {/* Próximos viajes + KPIs */}
        <div className="flex flex-col gap-4">
          {/* Trips */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarCheck size={16} className="text-blue-500" />
              Próximos Viajes
            </h2>
            {upcomingTrips.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay viajes próximos</p>
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
                      {v.checkOut && <p className="text-xs text-gray-400 flex-shrink-0">→ {v.checkOut}</p>}
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
              <p className="text-sm text-gray-400 text-center py-4">Sin registrar — ve a Marketing → KPIs</p>
            ) : (
              <div className="space-y-3 mt-3">
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
    </div>
  );
}
