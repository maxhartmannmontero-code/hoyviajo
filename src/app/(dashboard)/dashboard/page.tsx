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
  color: string;
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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

  // Financial this month
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

  // Current week KPIs
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen general de tu CRM</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Users size={20} className="text-[#3c93d6]" />}
          label="Total Contactos"
          value={contacts.length}
          sub={`+${newThisMonth} este mes`}
          color="bg-[#ddeef9]"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-purple-600" />}
          label="Deals Activos"
          value={activeDeals.length}
          sub={`Pipeline: ${formatCurrency(pipeline)}`}
          color="bg-purple-50"
        />
        <StatCard
          icon={<Bell size={20} className="text-orange-600" />}
          label="Follow-ups Pendientes"
          value={pendingFollowUps}
          color="bg-orange-50"
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-emerald-600" />}
          label="Clientes Activos"
          value={contacts.filter((c) => c.status === "cliente").length}
          color="bg-emerald-50"
        />
        <StatCard
          icon={<UserPlus size={20} className="text-cyan-600" />}
          label="Nuevos este Mes"
          value={newThisMonth}
          color="bg-cyan-50"
        />
        <StatCard
          icon={<DollarSign size={20} className="text-green-600" />}
          label="Deals Cerrados"
          value={formatCurrency(totalRevenue)}
          sub={`${closedWon.length} ganados`}
          color="bg-green-50"
        />
      </div>

      {/* Financial snapshot */}
      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-100">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Comisiones este mes</p>
          <p className="text-xl font-bold text-green-700">{fmtCLP(monthCommissions)}</p>
        </div>
        <div className="text-center border-x border-slate-200">
          <p className="text-xs text-gray-500 mb-1">Gastos registrados</p>
          <p className="text-xl font-bold text-red-600">{fmtCLP(monthExpTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Resultado neto</p>
          <p className={`text-xl font-bold ${monthNet >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {fmtCLP(monthNet)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Contactos Recientes</h2>
          {recentContacts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay contactos aún</p>
          ) : (
            <div className="space-y-3">
              {recentContacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#ddeef9] text-[#3c93d6] flex items-center justify-center font-semibold text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.company || c.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTACT_STATUS_COLORS[c.status]}`}>
                    {CONTACT_STATUS_LABELS[c.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Próximos Follow-ups</h2>
          {upcomingFollowUps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay follow-ups pendientes</p>
          ) : (
            <div className="space-y-3">
              {upcomingFollowUps.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.contactName}</p>
                    <p className="text-xs text-gray-500 truncate">{a.notes || a.type}</p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {a.nextFollowUp ? new Date(a.nextFollowUp + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 xl:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Deals por Etapa</h2>
          {deals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay deals registrados</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(DEAL_STAGE_LABELS).map(([stage, label]) => {
                const count = deals.filter((d) => d.stage === stage).length;
                const value = deals.filter((d) => d.stage === stage).reduce((s, d) => s + d.amount, 0);
                return (
                  <div key={stage} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(value)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming trips */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarCheck size={17} className="text-blue-500" /> Próximos Viajes
          </h2>
          {upcomingTrips.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay viajes próximos</p>
          ) : (
            <div className="space-y-3">
              {upcomingTrips.map((v) => (
                <div key={v.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {new Date(v.checkIn + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }).split(" ")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.contactName}</p>
                    <p className="text-xs text-gray-400 truncate">{v.description || v.fileName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-blue-600">{v.checkIn}</p>
                    {v.checkOut && <p className="text-xs text-gray-400">→ {v.checkOut}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly KPIs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Target size={17} className="text-purple-500" /> Actividad esta semana
          </h2>
          {!weekKPI ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin registrar — ve a Marketing → KPIs</p>
          ) : (
            <div className="space-y-3 mt-3">
              {KPI_SUMMARY.map(({ key, label, target }) => {
                const value = Number(weekKPI[key]) || 0;
                const pct = Math.min((value / target) * 100, 100);
                const color = pct >= 100 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-yellow-400" : "bg-gray-200";
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{label}</span>
                      <span className="font-semibold">{value}/{target}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
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
