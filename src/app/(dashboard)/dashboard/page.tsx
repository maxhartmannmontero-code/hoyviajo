"use client";

import { useEffect, useState } from "react";
import {
  Users, Bell, DollarSign, UserPlus, CheckCircle, CalendarCheck,
  Target, Globe, TrendingUp, TrendingDown, Eye, EyeOff, ShoppingBag,
  Hash, AlertCircle, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Contact, Activity, Deal, Sale, Expense, Voucher, WeeklyKPI } from "@/types";
import { formatCurrency, CONTACT_STATUS_COLORS, CONTACT_STATUS_LABELS } from "@/lib/utils";

const META = 4_000_000;

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

/* â”€â”€ StatCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  iconBg: string;
  alert?: boolean;
  delay?: string;
}

function StatCard({ icon, label, value, sub, iconBg, alert, delay }: StatCardProps) {
  return (
    <div
      className={[
        "group relative bg-[#FEFCF8] rounded-2xl p-5",
        "border border-[#E5DDD2]/70",
        "shadow-[0_1px_3px_rgba(30,37,51,0.04),0_4px_18px_rgba(30,37,51,0.05)]",
        "hover:shadow-[0_6px_24px_rgba(30,37,51,0.09),0_12px_40px_rgba(30,37,51,0.06)]",
        "hover:-translate-y-0.5 transition-all duration-300 cursor-default",
        "anim-fade-up",
        alert ? "ring-1 ring-red-300/60" : "",
        delay ?? "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-[1.08]`}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-semibold text-[#9EA9BA] uppercase tracking-[0.14em] mb-1.5">{label}</p>
      <p className="font-sans text-[1.65rem] font-bold text-[#1E2533] leading-none tabular-nums tracking-tight">{value}</p>
      {sub && <p className="text-[11.5px] text-[#9EA9BA] mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}

/* â”€â”€ SectionTitle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <h2 className="font-sans text-[1.15rem] font-semibold text-[#1E2533] mb-4 flex items-center gap-2.5 leading-none">
      <span className={`w-[3px] h-5 rounded-full flex-shrink-0 ${accent}`} />
      {children}
    </h2>
  );
}

function groupSalesByMonth(salesData: Sale[]) {
  const isEmit = (s: Sale) => s.status.toLowerCase().includes("emitid");
  const map = new Map<string, { amount: number; commission: number }>();
  for (const s of salesData) {
    if (!isEmit(s)) continue;
    const d = s.saleDate || s.createdAt || "";
    const ym = d.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const prev = map.get(ym) || { amount: 0, commission: 0 };
    map.set(ym, { amount: prev.amount + s.amount, commission: prev.commission + s.commission });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([key, { amount, commission }]) => ({
      key,
      label: new Date(key + "-15").toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
      amount,
      commission,
    }));
}

/* â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function DashboardPage() {
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals]         = useState<Deal[]>([]);
  const [sales, setSales]         = useState<Sale[]>([]);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [vouchers, setVouchers]   = useState<Voucher[]>([]);
  const [kpis, setKpis]           = useState<WeeklyKPI[]>([]);
  const [loading, setLoading]     = useState(true);
  const [gaData, setGaData]       = useState<{ sessions: number; users: number } | null>(null);
  const [masked, setMasked]       = useState(false);

  const hide = (v: string) => (masked ? "•••••" : v);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then(r => r.ok ? r.json() : []),
      fetch("/api/activities").then(r => r.ok ? r.json() : []),
      fetch("/api/deals").then(r => r.ok ? r.json() : []),
      fetch("/api/sales").then(r => r.ok ? r.json() : []),
      fetch("/api/expenses").then(r => r.ok ? r.json() : []),
      fetch("/api/vouchers").then(r => r.ok ? r.json() : []),
      fetch("/api/kpis").then(r => r.ok ? r.json() : []),
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
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          const row = data.find(d => d.month === thisMonth);
          if (row) setGaData({ sessions: Math.round(row.sessions), users: Math.round(row.activeUsers) });
        }
      })
      .catch(() => {});
  }, []);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  /* â”€â”€ Metrics â”€â”€ */
  const emitidas = (s: Sale) => s.status.toLowerCase().includes("emitid");

  const monthSales = sales.filter(s => {
    const d = s.saleDate || s.createdAt || "";
    return d.startsWith(thisMonth) && emitidas(s);
  });
  const monthSalesAmount = monthSales.reduce((sum, s) => sum + s.amount, 0);
  const monthSalesCount  = monthSales.length;
  const avgTicket        = monthSalesCount > 0 ? monthSalesAmount / monthSalesCount : 0;
  const monthCommissions = monthSales.reduce((sum, s) => sum + s.commission, 0);
  const monthExpTotal    = expenses.filter(e => e.month === thisMonth).reduce((sum, e) => sum + e.amount, 0);

  const sortedEmitidas = [...sales]
    .filter(emitidas)
    .sort((a, b) => (b.saleDate || b.createdAt || "").localeCompare(a.saleDate || a.createdAt || ""));
  const lastSaleDate  = sortedEmitidas[0]?.saleDate || sortedEmitidas[0]?.createdAt || null;
  const daysSinceSale = lastSaleDate
    ? Math.floor((now.getTime() - new Date(lastSaleDate + "T12:00:00").getTime()) / 86400000)
    : null;
  const recentSales = sortedEmitidas.slice(0, 5);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed  = now.getDate();
  const daysLeft    = daysInMonth - daysPassed;
  // META = objetivo de comisiones/margen mensual, no de ventas brutas
  const metaPctReal = monthCommissions > 0 ? (monthCommissions / META) * 100 : 0;
  const metaPct     = Math.min(metaPctReal, 100); // solo para la barra visual
  const expectedPct = (daysPassed / daysInMonth) * 100;
  const onTrack     = metaPctReal >= expectedPct;
  const remaining   = Math.max(META - monthCommissions, 0);
  const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
  const projected   = daysPassed > 0 ? (monthCommissions / daysPassed) * daysInMonth : 0;

  const netProfit   = monthCommissions - monthExpTotal;
  const marginPct   = monthSalesAmount > 0 ? (netProfit / monthSalesAmount) * 100 : 0;
  const salesChartData = groupSalesByMonth(sales);

  const newThisMonth      = contacts.filter(c => c.createdAt?.startsWith(thisMonth)).length;
  const pendingFollowUps  = activities.filter(a => a.status === "pendiente").length;
  const recentContacts    = [...contacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const upcomingFollowUps = activities
    .filter(a => a.status === "pendiente" && a.nextFollowUp)
    .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp))
    .slice(0, 5);

  const today       = now.toISOString().slice(0, 10);
  const upcomingTrips = vouchers
    .filter(v => v.checkIn && v.checkIn >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .slice(0, 4);

  const weekStart = (() => {
    const d   = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return d.toISOString().slice(0, 10);
  })();
  const weekKPI = kpis.find(k => k.weekStart === weekStart);
  const KPI_SUMMARY = [
    { key: "bni11s"       as keyof WeeklyKPI, label: "BNI 1-a-1s",   target: 8 },
    { key: "cotizaciones" as keyof WeeklyKPI, label: "Cotizaciones", target: 3 },
    { key: "cierres"      as keyof WeeklyKPI, label: "Cierres",      target: 1 },
    { key: "presenciales" as keyof WeeklyKPI, label: "Presenciales", target: 5 },
  ];

  void deals;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F2EDE5]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#C89035]/30 border-t-[#C89035] animate-spin" />
          <p className="font-sans text-lg text-[#1E2533]/50 italic">Cargando datos…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F2EDE5]">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex items-start justify-between anim-fade-up d-0">
          <div>
            <p className="text-[10.5px] font-semibold text-[#C89035] uppercase tracking-[0.2em] mb-2">
              {now.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="font-sans text-[2.6rem] font-bold text-[#1E2533] leading-none tracking-tight">
              Dashboard
            </h1>
            <p className="text-[13px] text-[#9EA9BA] mt-1.5 font-light tracking-wide">
              Resumen general · Hoy Viajo CRM
            </p>
          </div>
          <button
            onClick={() => setMasked(v => !v)}
            className={[
              "mt-2 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[12.5px] font-medium transition-all duration-200",
              masked
                ? "bg-[#1E2533]/[0.06] border-[#1E2533]/15 text-[#1E2533]/60"
                : "border-[#E5DDD2] text-[#9EA9BA] hover:text-[#1E2533]/60 hover:border-[#C8C0B6] bg-[#FEFCF8]",
            ].join(" ")}
          >
            {masked ? <EyeOff size={14} /> : <Eye size={14} />}
            {masked ? "Mostrar" : "Ocultar"}
          </button>
        </div>

        {/* ── Margen de utilidad ────────────────────────────────── */}
        <div className=”grid grid-cols-3 gap-3 anim-fade-up d-50”>
          {/* Margen neto */}
          <div className=”bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04)] p-5”>
            <div className=”flex items-center gap-2 mb-3”>
              {netProfit >= 0
                ? <TrendingUp size={15} className=”text-[#0B7A6C]” />
                : <TrendingDown size={15} className=”text-red-500” />}
              <p className=”text-[10px] font-semibold text-[#9EA9BA] uppercase tracking-[0.14em]”>Margen neto del mes</p>
            </div>
            <p className={`font-mono text-[1.65rem] font-bold tabular-nums leading-none ${netProfit >= 0 ? “text-[#0B7A6C]” : “text-red-500”}`}>
              {hide(fmtCLP(netProfit))}
            </p>
            <p className=”text-[11px] text-[#9EA9BA] mt-2”>comisiones − gastos operativos</p>
          </div>

          {/* Margen % */}
          <div className=”bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04)] p-5”>
            <div className=”flex items-center gap-2 mb-3”>
              {marginPct >= 0
                ? <ArrowUp size={15} className=”text-[#0B7A6C]” />
                : <ArrowDown size={15} className=”text-red-500” />}
              <p className=”text-[10px] font-semibold text-[#9EA9BA] uppercase tracking-[0.14em]”>Margen sobre ventas</p>
            </div>
            <p className={`font-mono text-[1.65rem] font-bold tabular-nums leading-none ${
              marginPct >= 15 ? “text-[#0B7A6C]” : marginPct >= 5 ? “text-[#C89035]” : “text-red-500”
            }`}>
              {masked ? “••%” : `${marginPct.toFixed(1)}%`}
            </p>
            <p className=”text-[11px] text-[#9EA9BA] mt-2”>
              {masked ? “••••” : monthSalesAmount > 0 ? `sobre ${fmtCLP(monthSalesAmount)} en ventas` : “sin ventas este mes”}
            </p>
          </div>

          {/* Comisiones vs gastos */}
          <div className=”bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04)] p-5”>
            <div className=”flex items-center gap-2 mb-3”>
              <DollarSign size={15} className=”text-[#C89035]” />
              <p className=”text-[10px] font-semibold text-[#9EA9BA] uppercase tracking-[0.14em]”>Comisiones del mes</p>
            </div>
            <p className=”font-mono text-[1.65rem] font-bold text-[#C89035] tabular-nums leading-none”>
              {hide(fmtCLP(monthCommissions))}
            </p>
            <p className=”text-[11px] text-[#9EA9BA] mt-2”>
              {monthExpTotal > 0
                ? <span>Gastos: <span className=”text-red-400 font-medium”>{masked ? “••••” : fmtCLP(monthExpTotal)}</span></span>
                : “sin gastos registrados”}
            </p>
          </div>
        </div>

        {/* â”€â”€ META HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div
          className="relative rounded-2xl overflow-hidden anim-fade-up d-100"
          style={{ background: "linear-gradient(135deg, #091525 0%, #0F2240 55%, #122C50 100%)" }}
        >
          {/* Decorative rings */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/[0.04]" />
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full border border-white/[0.04]" />
          {/* Decorative percentage ghost */}
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center pr-10 select-none pointer-events-none"
            aria-hidden
          >
            <span
              className="font-sans font-bold text-white/[0.04] leading-none"
              style={{ fontSize: "clamp(80px, 12vw, 140px)" }}
            >
              {masked ? "—" : `${metaPctReal.toFixed(0)}%`}
            </span>
          </div>
          {/* Subtle top line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ACFD46]/20 to-transparent" />

          <div className="relative px-7 pt-7 pb-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-semibold text-[#ACFD46]/70 uppercase tracking-[0.22em] mb-2">
                  Meta mensual · {monthLabel}
                </p>
                <div className="flex items-end gap-3">
                  <span className="font-sans text-[2.6rem] font-bold text-white leading-none tabular-nums">
                    {hide(fmtCLP(monthCommissions))}
                  </span>
                  <span className="text-white/35 text-base mb-1.5 font-light">
                    / {hide(fmtCLP(META))}
                  </span>
                </div>
                <p className="text-white/35 text-[11px] mt-1.5 tracking-wide">
                  comisiones del mes · ventas: {hide(fmtCLP(monthSalesAmount))}
                </p>
              </div>

              <div className="text-right mt-1 flex-shrink-0">
                <div className={[
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold",
                  onTrack
                    ? "bg-[#ACFD46]/15 text-[#ACFD46] border border-[#ACFD46]/20"
                    : "bg-red-500/15 text-red-300 border border-red-500/20",
                ].join(" ")}>
                  <div className={[
                    "w-1.5 h-1.5 rounded-full",
                    onTrack ? "bg-[#ACFD46]" : "bg-red-400",
                  ].join(" ")} />
                  {onTrack ? "En ritmo" : "Por debajo"}
                </div>
                <p className="text-white/30 text-[11px] mt-2 tracking-wide">{daysLeft} días restantes</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white/[0.07] rounded-full overflow-hidden mb-5">
              <div
                className={[
                  "h-2 rounded-full progress-animate",
                  metaPct >= 100 ? "bg-[#ACFD46]"
                  : metaPct >= 75 ? "bg-[#1A6EC0]"
                  : metaPct >= 50 ? "bg-[#C89035]"
                  : metaPct >= 25 ? "bg-orange-400"
                  : "bg-red-400",
                ].join(" ")}
                style={{ width: `${Math.max(metaPct, 1.5)}%` }}
              />
            </div>

            {/* Expected marker */}
            <div className="relative -mt-6 mb-4 h-2" style={{ paddingLeft: `${Math.min(expectedPct, 97)}%` }}>
              <div className="w-px h-3 bg-white/20 -mt-0.5" title={`Ritmo esperado: ${expectedPct.toFixed(0)}%`} />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-4 pt-1">
              {[
                { label: "Avance meta",   value: masked ? "—" : `${metaPctReal.toFixed(0)}%` },
                { label: "Operaciones",   value: `${monthSalesCount} ventas` },
                { label: "Com. promedio", value: monthSalesCount > 0 ? hide(fmtCLP(monthCommissions / monthSalesCount)) : "—" },
                {
                  label: "Proyección",
                  value: projected > 0 ? hide(fmtCLP(projected)) : "—",
                  highlight: projected >= META ? "text-[#ACFD46]" : "text-orange-300",
                },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[10px] text-white/30 mb-1 tracking-wide">{label}</p>
                  <p className={`font-mono text-[1.1rem] font-semibold tabular-nums ${highlight ?? "text-white"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Ventas vs Objetivo ────────────────────────────────── */}
        {salesChartData.length > 1 && (
          <div className=”bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04),0_4px_18px_rgba(30,37,51,0.04)] p-5 anim-fade-up d-125”>
            <div className=”flex items-center justify-between mb-1”>
              <h2 className=”font-sans text-[1.05rem] font-semibold text-[#1E2533] flex items-center gap-2.5 leading-none”>
                <span className=”w-[3px] h-5 rounded-full bg-[#C89035]” />
                Comisiones mensuales vs objetivo $4M
              </h2>
              <span className=”text-[11px] text-[#9EA9BA]”>Línea dorada = meta mensual</span>
            </div>
            <ResponsiveContainer width=”100%” height={210}>
              <ComposedChart data={salesChartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray=”3 3” stroke=”#F0EAE2” vertical={false} />
                <XAxis dataKey=”label” tick={{ fontSize: 10, fill: “#9EA9BA” }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: “#9EA9BA” }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  width={34}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const val = (payload[0]?.value ?? 0) as number;
                    const diff = val - META;
                    const pct = Math.abs((diff / META) * 100).toFixed(0);
                    return (
                      <div className=”bg-white border border-[#E5DDD2] shadow-lg rounded-xl px-4 py-3 text-xs”>
                        <p className=”font-semibold text-[#1E2533] mb-1.5”>{label}</p>
                        <p className=”font-mono font-semibold text-[#1E2533]”>{masked ? “•••••” : fmtCLP(val)}</p>
                        {!masked && <p className={`mt-1 font-medium ${diff >= 0 ? “text-[#0B7A6C]” : “text-[#C89035]”}`}>
                          {diff >= 0 ? `▲ +${pct}% sobre meta` : `▼ −${pct}% bajo meta`}
                        </p>}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={META}
                  stroke=”#C89035”
                  strokeDasharray=”6 3”
                  strokeWidth={1.5}
                />
                <Bar dataKey=”commission” radius={[5, 5, 0, 0]} maxBarSize={44}>
                  {salesChartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={
                        entry.commission >= META ? “#0B7A6C”
                        : entry.key === thisMonth ? “#1A6EC0”
                        : “#BDD8F3”
                      }
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div className=”flex items-center gap-5 px-1 -mt-1”>
              <span className=”flex items-center gap-1.5 text-[11px] text-[#9EA9BA]”>
                <span className=”w-3 h-3 rounded-sm bg-[#0B7A6C] inline-block” /> Sobre $4M
              </span>
              <span className=”flex items-center gap-1.5 text-[11px] text-[#9EA9BA]”>
                <span className=”w-3 h-3 rounded-sm bg-[#1A6EC0] inline-block” /> Mes actual
              </span>
              <span className=”flex items-center gap-1.5 text-[11px] text-[#9EA9BA]”>
                <span className=”w-3 h-3 rounded-sm bg-[#BDD8F3] inline-block” /> Bajo objetivo
              </span>
              <span className=”flex items-center gap-1.5 text-[11px] text-[#C89035]”>
                <span className=”w-5 border-t border-dashed border-[#C89035] inline-block” /> Objetivo
              </span>
            </div>
          </div>
        )}

        {/* â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className=”grid grid-cols-2 xl:grid-cols-3 gap-4”>
          <StatCard
            icon={<ShoppingBag size={17} className="text-[#1A6EC0]" />}
            label="Ventas del mes"
            value={hide(fmtCLP(monthSalesAmount))}
            sub={`${monthSalesCount} operaciones emitidas`}
            iconBg="bg-[#D4E8F9]"
            delay="d-150"
          />
          <StatCard
            icon={<Hash size={17} className="text-indigo-600" />}
            label="Ticket promedio"
            value={avgTicket > 0 ? hide(fmtCLP(avgTicket)) : "—"}
            sub={monthSalesCount > 0 ? `sobre ${monthSalesCount} ventas` : "sin ventas este mes"}
            iconBg="bg-indigo-50"
            delay="d-200"
          />
          <StatCard
            icon={<AlertCircle size={17} className={daysSinceSale !== null && daysSinceSale > 3 ? "text-red-500" : "text-[#0B7A6C]"} />}
            label="Días sin venta"
            value={daysSinceSale !== null ? `${daysSinceSale}d` : "—"}
            sub={lastSaleDate
              ? `Última: ${new Date(lastSaleDate + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}`
              : "sin ventas registradas"}
            iconBg={daysSinceSale !== null && daysSinceSale > 3 ? "bg-red-50" : "bg-[#D0EDE9]"}
            alert={daysSinceSale !== null && daysSinceSale > 3}
            delay="d-250"
          />
          <StatCard
            icon={<Bell size={17} className="text-orange-500" />}
            label="Follow-ups pendientes"
            value={pendingFollowUps}
            sub={pendingFollowUps > 0 ? "requieren atención" : "todo al día"}
            iconBg="bg-orange-50"
            delay="d-350"
          />
          <StatCard
            icon={<UserPlus size={17} className="text-emerald-600" />}
            label="Contactos nuevos"
            value={newThisMonth}
            sub={`${contacts.filter(c => c.status === "cliente").length} clientes activos`}
            iconBg="bg-emerald-50"
            delay="d-400"
          />
        </div>

        {/* â”€â”€ Bottom grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Últimas ventas */}
          <div className="bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04),0_4px_18px_rgba(30,37,51,0.04)] p-5 anim-fade-up d-200">
            <SectionTitle accent="bg-[#1A6EC0]">Últimas ventas</SectionTitle>
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-[#9EA9BA]">
                <ShoppingBag size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No hay ventas emitidas aún</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentSales.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3.5 px-2 py-2.5 rounded-xl hover:bg-[#F5F0E8] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#D4E8F9] text-[#1A6EC0] flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#1E2533] truncate">{s.product || "—"}</p>
                      <p className="text-[11.5px] text-[#9EA9BA] truncate">{s.clientName || s.saleDate || "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-[13.5px] font-semibold text-[#1A6EC0] tabular-nums">
                        {hide(fmtCLP(s.amount))}
                      </p>
                      {s.saleDate && (
                        <p className="text-[11px] text-[#9EA9BA] mt-0.5">
                          {new Date(s.saleDate + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GA4 + Follow-ups */}
          <div className="flex flex-col gap-4">
            {/* GA4 */}
            <div className={[
              "rounded-2xl border p-4 flex items-center gap-4",
              gaData
                ? "bg-[#FEFCF8] border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04)]"
                : "bg-[#F5F0E8] border-dashed border-[#D5CCC1]",
              "anim-fade-up d-250",
            ].join(" ")}>
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${gaData ? "bg-[#D4E8F9]" : "bg-[#E5DDD2]"}`}>
                <Globe size={17} className={gaData ? "text-[#1A6EC0]" : "text-[#9EA9BA]"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[#9EA9BA] uppercase tracking-[0.14em] mb-1">
                  Visitas web este mes
                </p>
                {gaData ? (
                  <div className="flex items-end gap-5">
                    <div>
                      <p className="font-mono text-[1.5rem] font-semibold text-[#1E2533] tabular-nums leading-none">
                        {gaData.sessions.toLocaleString("es-CL")}
                      </p>
                      <p className="text-[11px] text-[#9EA9BA] mt-0.5">sesiones</p>
                    </div>
                    <div>
                      <p className="font-mono text-[1.5rem] font-semibold text-[#1E2533] tabular-nums leading-none">
                        {gaData.users.toLocaleString("es-CL")}
                      </p>
                      <p className="text-[11px] text-[#9EA9BA] mt-0.5">usuarios únicos</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#9EA9BA] italic">Sin datos GA4 aún</p>
                )}
              </div>
            </div>

            {/* Follow-ups */}
            <div className="bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04),0_4px_18px_rgba(30,37,51,0.04)] p-5 flex-1 anim-fade-up d-300">
              <SectionTitle accent="bg-orange-400">Próximos Follow-ups</SectionTitle>
              {upcomingFollowUps.length === 0 ? (
                <div className="flex flex-col items-center py-5 text-[#9EA9BA]">
                  <CheckCircle size={24} className="mb-1.5 opacity-30" />
                  <p className="text-sm">No hay follow-ups pendientes</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {upcomingFollowUps.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3.5 px-2 py-2.5 rounded-xl hover:bg-[#F5F0E8] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center flex-shrink-0">
                        <Bell size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-[#1E2533] truncate">{a.contactName}</p>
                        <p className="text-[11.5px] text-[#9EA9BA] truncate">{a.notes || a.type}</p>
                      </div>
                      <p className="text-[11.5px] font-semibold text-orange-500 whitespace-nowrap flex-shrink-0">
                        {a.nextFollowUp
                          ? new Date(a.nextFollowUp + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contactos recientes */}
          <div className="bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04),0_4px_18px_rgba(30,37,51,0.04)] p-5 anim-fade-up d-250">
            <SectionTitle accent="bg-emerald-500">Contactos Recientes</SectionTitle>
            {recentContacts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-[#9EA9BA]">
                <Users size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No hay contactos aún</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentContacts.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3.5 px-2 py-2.5 rounded-xl hover:bg-[#F5F0E8] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#D4E8F9] text-[#1A6EC0] flex items-center justify-center font-bold text-[13px] flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#1E2533] truncate">{c.name}</p>
                      <p className="text-[11.5px] text-[#9EA9BA] truncate">{c.company || c.email}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${CONTACT_STATUS_COLORS[c.status]}`}>
                      {CONTACT_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos viajes + Weekly KPIs */}
          <div className="flex flex-col gap-4">

            {/* Trips */}
            <div className="bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04),0_4px_18px_rgba(30,37,51,0.04)] p-5 anim-fade-up d-300">
              <SectionTitle accent="bg-[#1A6EC0]">Próximos Viajes</SectionTitle>
              {upcomingTrips.length === 0 ? (
                <div className="flex flex-col items-center py-5 text-[#9EA9BA]">
                  <CalendarCheck size={24} className="mb-1.5 opacity-30" />
                  <p className="text-sm">No hay viajes próximos</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {upcomingTrips.map(v => {
                    const checkInDate = new Date(v.checkIn + "T12:00:00");
                    return (
                      <div
                        key={v.id}
                        className="flex items-center gap-3.5 px-2 py-2 rounded-xl hover:bg-[#F5F0E8] transition-colors"
                      >
                        <div className="w-11 h-11 rounded-xl bg-[#D4E8F9] text-[#1A6EC0] flex flex-col items-center justify-center flex-shrink-0 border border-[#BDD8F3]">
                          <span className="text-[13px] font-bold leading-none">{checkInDate.getDate()}</span>
                          <span className="text-[9px] uppercase text-[#1A6EC0]/60 leading-none mt-0.5 tracking-wider">
                            {checkInDate.toLocaleDateString("es-CL", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-[#1E2533] truncate">{v.contactName}</p>
                          <p className="text-[11.5px] text-[#9EA9BA] truncate">{v.description || v.fileName}</p>
                        </div>
                        {v.checkOut && (
                          <p className="text-[11px] text-[#9EA9BA] flex-shrink-0">
                            â†’ {v.checkOut}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weekly KPIs */}
            <div className="bg-[#FEFCF8] rounded-2xl border border-[#E5DDD2]/70 shadow-[0_1px_3px_rgba(30,37,51,0.04),0_4px_18px_rgba(30,37,51,0.04)] p-5 anim-fade-up d-350">
              <SectionTitle accent="bg-purple-500">Actividad esta semana</SectionTitle>
              {!weekKPI ? (
                <div className="flex flex-col items-center py-5 text-[#9EA9BA]">
                  <Target size={24} className="mb-1.5 opacity-30" />
                  <p className="text-sm text-center">Sin registrar — ve a Marketing â†’ KPIs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {KPI_SUMMARY.map(({ key, label, target }) => {
                    const value = Number(weekKPI[key]) || 0;
                    const pct   = Math.min((value / target) * 100, 100);
                    const barColor =
                      pct >= 100 ? "bg-[#ACFD46]"
                      : pct >= 60  ? "bg-[#1A6EC0]"
                      : pct >= 30  ? "bg-[#C89035]"
                      : "bg-[#E5DDD2]";
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-[12.5px] font-medium text-[#1E2533]/80">{label}</span>
                          <span className="font-mono text-[12px] tabular-nums text-[#9EA9BA]">
                            <span className={pct >= 100 ? "text-[#0B7A6C] font-semibold" : "text-[#1E2533] font-semibold"}>
                              {value}
                            </span>
                            <span className="text-[#C8C0B6]">/{target}</span>
                          </span>
                        </div>
                        <div className="w-full h-[5px] bg-[#EDE7DF] rounded-full overflow-hidden">
                          <div
                            className={`h-[5px] rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
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
    </div>
  );
}

