"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Award, Hash, ShoppingBag, Minus } from "lucide-react";
import { Sale } from "@/types";

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) =>
  `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

interface Metrics {
  count: number;
  gross: number;
  commissions: number;
  avgTicket: number;
  expenses: number;
}

interface TrendPoint {
  month: string;
  label: string;
  gross: number;
  commissions: number;
  expenses: number;
  count: number;
}

interface ReportData {
  month: string;
  current: Metrics;
  prev: Omit<Metrics, "expenses">;
  expenseByCat: Record<string, number>;
  topClients: { name: string; amount: number }[];
  products: { name: string; amount: number }[];
  trend: TrendPoint[];
  sales: Sale[];
}

function delta(current: number, prev: number) {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">sin datos ant.</span>;
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {fmtPct(pct)}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  pct: number | null;
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
}

function KpiCard({ label, value, sub, pct, accent, iconBg, icon }: KpiCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${accent} p-5 shadow-sm flex items-start gap-4`}>
      <div className={`p-2.5 rounded-xl ${iconBg} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none tabular-nums tracking-tight">{value}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <DeltaBadge pct={pct} />
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

const PRODUCT_COLORS: Record<string, string> = {
  "Vuelo": "#3c93d6",
  "Hotel": "#8b5cf6",
  "Traslado": "#10b981",
  "Actividad": "#f59e0b",
  "Paquete": "#f97316",
};
const DEFAULT_COLOR = "#94a3b8";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: {fmtCLP(p.value)}
        </p>
      ))}
    </div>
  );
};

const PAYMENT_LABELS: Record<string, string> = {
  GP: "Ganancia", TD: "Tarjeta débito", TC: "Tarjeta crédito", EF: "Efectivo",
};

export default function ReportesPage() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const monthOptions = generateMonthOptions();

  const fetchData = useCallback((m: string) => {
    setLoading(true);
    fetch(`/api/reportes?month=${m}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(month); }, [month, fetchData]);

  const c = data?.current;
  const p = data?.prev;

  const grossMax = Math.max(...(data?.topClients.map((cl) => cl.amount) ?? [1]));

  return (
    <div className="min-h-screen bg-[#f4efe6]">
      {/* Header */}
      <div className="bg-[#1a2e4a] text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-1">Hoy Viajo</p>
            <h1 className="text-2xl font-bold">Reportes de Ventas</h1>
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#acfd46] cursor-pointer"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value} className="text-gray-900 bg-white">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#3c93d6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando datos...</p>
          </div>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Error al cargar datos.</div>
      ) : (
        <div className="p-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Ventas Brutas"
              value={fmtCLP(c!.gross)}
              sub={`${c!.count} operaciones`}
              pct={delta(c!.gross, p!.gross)}
              accent="border-l-[#3c93d6]"
              iconBg="bg-blue-50"
              icon={<DollarSign size={18} className="text-[#3c93d6]" />}
            />
            <KpiCard
              label="Comisiones"
              value={fmtCLP(c!.commissions)}
              sub={c!.gross > 0 ? `${((c!.commissions / c!.gross) * 100).toFixed(1)}% sobre ventas` : undefined}
              pct={delta(c!.commissions, p!.commissions)}
              accent="border-l-emerald-500"
              iconBg="bg-emerald-50"
              icon={<Award size={18} className="text-emerald-500" />}
            />
            <KpiCard
              label="Ticket Promedio"
              value={fmtCLP(c!.avgTicket)}
              sub={`vs ${fmtCLP(p!.avgTicket)} mes ant.`}
              pct={delta(c!.avgTicket, p!.avgTicket)}
              accent="border-l-amber-400"
              iconBg="bg-amber-50"
              icon={<Hash size={18} className="text-amber-500" />}
            />
            <KpiCard
              label="Gastos Operativos"
              value={fmtCLP(c!.expenses)}
              sub={c!.expenses > 0 ? `Neto: ${fmtCLP(c!.commissions - c!.expenses)}` : "sin gastos registrados"}
              pct={null}
              accent="border-l-slate-300"
              iconBg="bg-slate-50"
              icon={<ShoppingBag size={18} className="text-slate-400" />}
            />
          </div>

          {/* Tendencia + Productos */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Tendencia 6 meses */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Tendencia â€” Ãºltimos 6 meses
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="gross" name="Ventas brutas" fill="#3c93d6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Line dataKey="commissions" name="Comisiones" stroke="#acfd46" strokeWidth={2.5} dot={{ r: 4, fill: "#acfd46", stroke: "#fff", strokeWidth: 2 }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-3 justify-end">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded bg-[#3c93d6]" /> Ventas brutas
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-5 h-0.5 bg-[#acfd46] inline-block" /> Comisiones
                </span>
              </div>
            </div>

            {/* Por producto */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Por producto
              </h2>
              {data.products.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin ventas este mes</p>
              ) : (
                <div className="space-y-3">
                  {data.products.map(({ name, amount }) => {
                    const pct = c!.gross > 0 ? (amount / c!.gross) * 100 : 0;
                    const color = PRODUCT_COLORS[name] ?? DEFAULT_COLOR;
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            {name}
                          </span>
                          <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtCLP(amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top clientes + Detalle ventas */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Top clientes */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Top clientes
              </h2>
              {data.topClients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin ventas este mes</p>
              ) : (
                <div className="space-y-3">
                  {data.topClients.map(({ name, amount }, i) => {
                    const pct = grossMax > 0 ? (amount / grossMax) * 100 : 0;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                            <span className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0 tabular-nums">{fmtCLP(amount)}</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-gradient-to-r from-[#3c93d6] to-[#acfd46]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detalle ventas */}
            <div className="xl:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Detalle de ventas
              </h2>
              {data.sales.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin ventas registradas para este mes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs text-gray-400 uppercase tracking-wider font-semibold pb-2 pr-3">Fecha</th>
                        <th className="text-left text-xs text-gray-400 uppercase tracking-wider font-semibold pb-2 pr-3">Cliente</th>
                        <th className="text-left text-xs text-gray-400 uppercase tracking-wider font-semibold pb-2 pr-3">Producto</th>
                        <th className="text-right text-xs text-gray-400 uppercase tracking-wider font-semibold pb-2 pr-3">Monto</th>
                        <th className="text-right text-xs text-gray-400 uppercase tracking-wider font-semibold pb-2">ComisiÃ³n</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sales.map((s) => {
                        const color = PRODUCT_COLORS[s.product] ?? DEFAULT_COLOR;
                        const date = (s.saleDate || s.createdAt || "").slice(0, 10);
                        const fmtDate = date
                          ? new Date(date + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
                          : "â€”";
                        return (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <td className="py-2.5 pr-3 text-gray-400 text-xs">{fmtDate}</td>
                            <td className="py-2.5 pr-3 font-medium text-gray-800">{s.clientName}</td>
                            <td className="py-2.5 pr-3">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>
                                {s.product || "â€”"}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-right font-bold text-gray-900 tabular-nums">{fmtCLP(s.amount)}</td>
                            <td className="py-2.5 text-right">
                              {s.commission > 0 ? (
                                <span className="text-emerald-600 font-semibold tabular-nums">{fmtCLP(s.commission)}</span>
                              ) : (
                                <Minus size={12} className="text-gray-300 ml-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={3} className="pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Total â€” {data.sales.length} ventas
                        </td>
                        <td className="pt-3 text-right font-bold text-gray-900 tabular-nums">{fmtCLP(c!.gross)}</td>
                        <td className="pt-3 text-right font-bold text-emerald-600 tabular-nums">{fmtCLP(c!.commissions)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Gastos por categorÃ­a */}
          {Object.keys(data.expenseByCat).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Gastos por categorÃ­a
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(data.expenseByCat)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => (
                    <div key={cat} className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 font-medium mb-1 truncate">{cat}</p>
                      <p className="text-base font-bold text-gray-900 tabular-nums">{fmtCLP(amount)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

