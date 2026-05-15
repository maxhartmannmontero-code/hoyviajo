"use client";

import { useEffect, useState, useRef } from "react";
import {
  Upload, X, Search, TrendingUp, TrendingDown, DollarSign,
  CheckCircle, FileSpreadsheet, Percent, UserPlus, RefreshCw, Target, ChevronDown, ChevronUp, Eye, EyeOff, Plus,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Sale } from "@/types";
import { formatCurrency } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusColor(val: string): string {
  const s = val.toLowerCase();
  if (s === "emitida" || s.includes("emitid")) return "bg-green-100 text-green-700";
  if (s.includes("cancel")) return "bg-red-100 text-red-700";
  if (s.includes("conclu")) return "bg-blue-100 text-blue-700";
  if (s.includes("pagad") || s.includes("pagó")) return "bg-green-100 text-green-700";
  if (s.includes("pendiente")) return "bg-yellow-100 text-yellow-700";
  if (s.includes("proceso")) return "bg-purple-100 text-purple-700";
  // payment methods (GP, TD, TC, PR, PR+TC)
  if (["gp", "td", "tc", "pr"].includes(s) || s.includes("+")) return "bg-violet-100 text-violet-700";
  return "bg-gray-100 text-gray-600";
}

function parseAmount(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[^0-9.,\-]/g, "");
  if (!str) return 0;
  const lastComma = str.lastIndexOf(",");
  const lastPeriod = str.lastIndexOf(".");
  if (lastComma > lastPeriod) {
    // European/Chilean: 1.234.567,89
    return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // American: 1,234,567.89
  return parseFloat(str.replace(/,/g, "")) || 0;
}

function extractYearMonth(dateStr: string): string {
  if (!dateStr) return "?";
  const s = dateStr.trim();
  // ISO: 2025-09-30
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  // 4-digit year: MM/DD/YYYY (XLSX US output) or DD/MM/YYYY
  const m4 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m4) {
    const [, a, b, y] = m4;
    if (parseInt(a) > 12) return `${y}-${b.padStart(2, "0")}`;  // a is day → b is month
    if (parseInt(b) > 12) return `${y}-${a.padStart(2, "0")}`;  // b is day → a is month
    return `${y}-${a.padStart(2, "0")}`;  // ambiguous: XLSX uses MM/DD → a is month
  }
  // 2-digit year: M/D/YY or D/M/YY (optional time suffix)
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?!\d)/);
  if (m2) {
    const [, a, b, y] = m2;
    const yr = 2000 + parseInt(y);
    if (parseInt(a) > 12) return `${yr}-${b.padStart(2, "0")}`;
    if (parseInt(b) > 12) return `${yr}-${a.padStart(2, "0")}`;
    return `${yr}-${a.padStart(2, "0")}`;
  }
  // Excel serial number (e.g. "45932" — date cells with unrecognised format)
  const num = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(num) && num > 40000 && num < 60000 && /^\d[\d,.]*$/.test(s)) {
    const d = new Date(Math.round((num - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return "?";
}

function groupByMonth(sales: Sale[]) {
  const map = new Map<string, { total: number; emitidas: number; canceladas: number; amount: number; commission: number }>();
  for (const s of sales) {
    const ym = extractYearMonth(s.saleDate);
    const key = ym !== "?" ? ym : "sin-fecha";
    const prev = map.get(key) ?? { total: 0, emitidas: 0, canceladas: 0, amount: 0, commission: 0 };
    const isEmit = s.status.toLowerCase().includes("emitid");
    const isCancel = s.status.toLowerCase().includes("cancelad");
    map.set(key, {
      total: prev.total + 1,
      emitidas: prev.emitidas + (isEmit ? 1 : 0),
      canceladas: prev.canceladas + (isCancel ? 1 : 0),
      amount: prev.amount + (isEmit ? s.amount : 0),
      commission: prev.commission + (isEmit ? s.commission : 0),
    });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === "sin-fecha") return 1;
      if (b === "sin-fecha") return -1;
      return a.localeCompare(b);
    })
    .map(([key, d]) => ({
      key,
      label: key !== "sin-fecha"
        ? new Date(key + "-15").toLocaleDateString("es-CL", { month: "short", year: "2-digit" })
        : "Sin fecha",
      ...d,
    }));
}

// ─── Column detection ───────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  saleDate: "Fecha de venta",
  travelDate: "Fecha de viaje",
  product: "Producto",
  detail: "Detalle",
  checkIn: "Check in",
  checkOut: "Check out",
  status: "Estado",
  paymentStatus: "Estado de pago",
  amount: "Monto",
  currency: "Moneda",
  commission: "Comisión",
  clientName: "Cliente",
  clientEmail: "Email",
  clientPhone: "Teléfono",
  partner: "Partner",
};

function detectColumns(headers: string[]): Record<string, number> {
  const norm = headers.map((h) => String(h ?? "").toLowerCase().replace(/\s+/g, " ").trim());
  const taken = new Set<number>();
  const map: Record<string, number> = {};

  const fields: [string, string[]][] = [
    ["saleDate", ["fecha de venta", "fecha venta", "fecha de reserva", "fecha reserva", "fecha de emisión", "fecha de emision", "fecha emision", "fecha"]],
    ["travelDate", ["fecha de viaje", "fecha viaje", "fecha del viaje"]],
    ["product", ["nombre del producto", "nombre producto", "producto", "servicio"]],
    ["detail", ["detalle", "descripción", "descripcion"]],
    ["checkIn", ["check in", "check-in", "checkin", "entrada", "fecha entrada"]],
    ["checkOut", ["check out", "check-out", "checkout", "salida", "fecha salida"]],
    ["paymentStatus", ["m. de pago", "m de pago", "medio de pago", "método de pago", "metodo de pago", "estado resultado de pago", "resultado de pago", "estado de pago", "resultado pago"]],
    ["status", ["estado"]],
    ["amount", ["precio venta", "monto de pago", "monto", "importe", "precio", "total", "valor"]],
    ["currency", ["moneda", "currency"]],
    ["commission", ["comisión", "comision", "comisiones", "commission", "fee", "com.", "com "]],
    ["clientName", ["nombre del cliente", "nombre del pasajero", "nombre pasajero", "pasajero", "cliente", "nombre"]],
    ["clientEmail", ["correo electrónico", "correo electronico", "email", "correo", "mail"]],
    ["clientPhone", ["teléfono", "telefono", "celular", "phone", "tel"]],
    ["partner", ["partner", "agencia", "agente", "operador", "proveedor"]],
  ];

  for (const [field, patterns] of fields) {
    for (const pattern of patterns) {
      const idx = norm.findIndex((h, i) => !taken.has(i) && h.includes(pattern));
      if (idx !== -1) {
        map[field] = idx;
        taken.add(idx);
        break;
      }
    }
  }
  return map;
}

function mapRows(
  rows: unknown[][],
  colMap: Record<string, number>
): Omit<Sale, "id" | "createdAt">[] {
  const get = (row: unknown[], key: string) =>
    colMap[key] !== undefined ? String(row[colMap[key]] ?? "") : "";
  return rows.map((row) => ({
    saleDate: get(row, "saleDate"),
    travelDate: get(row, "travelDate"),
    product: get(row, "product"),
    detail: get(row, "detail"),
    checkIn: get(row, "checkIn"),
    checkOut: get(row, "checkOut"),
    status: get(row, "status"),
    paymentStatus: get(row, "paymentStatus"),
    amount: colMap.amount !== undefined ? parseAmount(row[colMap.amount]) : 0,
    currency: get(row, "currency") || "CLP",
    commission: colMap.commission !== undefined ? parseAmount(row[colMap.commission]) : 0,
    clientName: get(row, "clientName"),
    clientEmail: get(row, "clientEmail"),
    clientPhone: get(row, "clientPhone"),
    partner: get(row, "partner"),
    notes: "",
  }));
}

// ─── Analytics Panel ────────────────────────────────────────────────────────

const TICK_FMT = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

function AnalyticsPanel({ sales, currency, masked, onToggleMask }: {
  sales: Sale[]; currency: string; masked: boolean; onToggleMask: () => void;
}) {
  const [showTable, setShowTable] = useState(false);
  const allData = groupByMonth(sales);
  const data = allData.filter((m) => m.key !== "sin-fecha");
  const sinFecha = allData.find((m) => m.key === "sin-fecha");

  const fmt = (v: number) => formatCurrency(v, currency);
  const hide = (v: number) => masked ? "••••••" : fmt(v);
  const hideAxis = (v: number) => masked ? "•••" : TICK_FMT(v);

  if (allData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <p className="text-sm text-gray-400 text-center py-6">Sin datos para analizar</p>
      </div>
    );
  }

  const avg = data.length > 0 ? data.reduce((s, m) => s + m.amount, 0) / data.length : 0;
  const maxAmount = Math.max(...data.map((m) => m.amount));

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: { value: number; name: string }[]; label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const ventas = payload.find((p) => p.name === "amount");
    const com = payload.find((p) => p.name === "commission");
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {ventas && <p className="text-[#3c93d6]">Ventas: <span className="font-bold">{hide(ventas.value)}</span></p>}
        {com && com.value > 0 && <p className="text-green-600">Comisión: <span className="font-bold">{hide(com.value)}</span></p>}
        {!masked && ventas && com && com.value > 0 && (
          <p className="text-gray-400 mt-1">Margen: {((com.value / ventas.value) * 100).toFixed(1)}%</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-gray-900">Resultados por mes</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Promedio: <span className="font-semibold text-gray-600">{hide(avg)}</span>
          </span>
          <button
            onClick={onToggleMask}
            title={masked ? "Mostrar valores" : "Ocultar valores"}
            className={`p-1.5 rounded-lg transition-colors ${masked ? "bg-gray-200 text-gray-500" : "hover:bg-gray-100 text-gray-300 hover:text-gray-500"}`}
          >
            {masked ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

        </div>
      </div>

      {/* Chart — full width */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={hideAxis}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
          <ReferenceLine
            y={avg}
            stroke="#cbd5e1"
            strokeDasharray="5 3"
            label={{ value: "prom.", position: "right", fill: "#94a3b8", fontSize: 10 }}
          />
          <Bar dataKey="amount" name="amount" radius={[5, 5, 0, 0]} maxBarSize={48}>
            {data.map((m) => (
              <Cell
                key={m.key}
                fill={m.amount === maxAmount ? "#1d6fa8" : m.amount >= avg ? "#3c93d6" : "#93c5e8"}
              />
            ))}
          </Bar>
          <Line
            dataKey="commission"
            name="commission"
            type="monotone"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend + toggle */}
      <div className="flex items-center justify-between mt-2 mb-2 px-1">
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#3c93d6] inline-block" /> Ventas emitidas</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-green-500 inline-block" /> Comisiones</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-slate-400 inline-block" /> Promedio mensual</span>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showTable ? "Ocultar detalle" : "Ver detalle por mes"}
        </button>
      </div>

      {/* Monthly table — collapsible */}
      {showTable && <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left pb-2 font-medium text-gray-400 uppercase tracking-wide text-[10px]">Mes</th>
              <th className="text-right pb-2 font-medium text-gray-400 uppercase tracking-wide text-[10px]">Ventas</th>
              <th className="text-right pb-2 font-medium text-gray-400 uppercase tracking-wide text-[10px]">Ingresos</th>
              <th className="text-right pb-2 font-medium text-gray-400 uppercase tracking-wide text-[10px] hidden xl:table-cell">vs prom.</th>
              <th className="text-right pb-2 font-medium text-gray-400 uppercase tracking-wide text-[10px]">Comisiones</th>
              <th className="text-right pb-2 font-medium text-gray-400 uppercase tracking-wide text-[10px]">% Com.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => {
              const isBest = m.amount === maxAmount;
              const aboveAvg = m.amount >= avg;
              const vsAvg = avg > 0 ? ((m.amount - avg) / avg) * 100 : 0;
              return (
                <tr key={m.key} className={`border-b border-gray-50 last:border-0 ${isBest ? "bg-amber-50" : ""}`}>
                  <td className="py-2 font-medium text-gray-900 flex items-center gap-1.5">
                    {isBest && <span className="text-amber-400" title="Mejor mes">★</span>}
                    {m.label}
                  </td>
                  <td className="py-2 text-right text-gray-600">{m.emitidas}</td>
                  <td className="py-2 text-right font-semibold text-gray-900">{m.amount > 0 ? hide(m.amount) : "—"}</td>
                  <td className="py-2 text-right hidden xl:table-cell">
                    {!masked && (
                      <span className={`text-xs font-medium ${aboveAvg ? "text-green-600" : "text-red-400"}`}>
                        {vsAvg >= 0 ? "+" : ""}{vsAvg.toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right text-[#3c93d6]">
                    {m.commission > 0 ? hide(m.commission) : "—"}
                  </td>
                  <td className="py-2 text-right text-gray-400">
                    {!masked && m.amount > 0 && m.commission > 0 ? `${((m.commission / m.amount) * 100).toFixed(1)}%` : masked ? "••" : "—"}
                  </td>
                </tr>
              );
            })}
            {sinFecha && sinFecha.total > 0 && (
              <tr className="border-t border-dashed border-amber-200 bg-amber-50/50">
                <td className="py-2 text-amber-600 font-medium text-[11px]">Sin fecha ({sinFecha.total})</td>
                <td className="py-2 text-right text-amber-600">{sinFecha.emitidas}</td>
                <td className="py-2 text-right text-amber-700 font-semibold">{sinFecha.amount > 0 ? hide(sinFecha.amount) : "—"}</td>
                <td className="py-2 hidden xl:table-cell" />
                <td className="py-2 text-right text-amber-500">{sinFecha.commission > 0 ? hide(sinFecha.commission) : "—"}</td>
                <td className="py-2 text-right text-amber-400">
                  {sinFecha.amount > 0 && sinFecha.commission > 0 ? `${((sinFecha.commission / sinFecha.amount) * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="pt-2 font-bold text-gray-900">Total</td>
              <td className="pt-2 text-right font-bold text-gray-700">
                {allData.reduce((s, m) => s + m.emitidas, 0)}
              </td>
              <td className="pt-2 text-right font-bold text-gray-900">
                {hide(allData.reduce((s, m) => s + m.amount, 0))}
              </td>
              <td className="pt-2 hidden xl:table-cell" />
              <td className="pt-2 text-right font-bold text-[#3c93d6]">
                {hide(allData.reduce((s, m) => s + m.commission, 0))}
              </td>
              <td className="pt-2 text-right text-gray-400">
                {(() => {
                  if (masked) return "••";
                  const tot = allData.reduce((s, m) => s + m.amount, 0);
                  const com = allData.reduce((s, m) => s + m.commission, 0);
                  return tot > 0 && com > 0 ? `${((com / tot) * 100).toFixed(1)}%` : "—";
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>}
    </div>
  );
}

// ─── Projections Panel ──────────────────────────────────────────────────────

function ProjectionsPanel({ sales, currency }: { sales: Sale[]; currency: string }) {
  const data = groupByMonth(sales).filter((m) => m.key !== "sin-fecha");
  if (data.length < 2) return null;

  const fmt = (v: number) => formatCurrency(v, currency);

  // 2025: abr–dic (lo que tenemos)
  const m2025 = data.filter((m) => m.key.startsWith("2025"));
  // 2026: lo que tengamos hasta hoy
  const m2026 = data.filter((m) => m.key.startsWith("2026"));

  const sum2025 = m2025.reduce((s, m) => s + m.amount, 0);
  const sum2026 = m2026.reduce((s, m) => s + m.amount, 0);
  const com2025 = m2025.reduce((s, m) => s + m.commission, 0);
  const com2026 = m2026.reduce((s, m) => s + m.commission, 0);
  const avg2025 = m2025.length > 0 ? sum2025 / m2025.length : 0;
  const avg2026 = m2026.length > 0 ? sum2026 / m2026.length : 0;
  const avgCom2026 = m2026.length > 0 ? com2026 / m2026.length : 0;

  // Proyección 2026 anual basada en promedio actual × 12
  const proj2026 = avg2026 * 12;
  const projCom2026 = avgCom2026 * 12;

  // Cambio YoY (promedio mensual)
  const yoy = avg2025 > 0 ? ((avg2026 - avg2025) / avg2025) * 100 : 0;
  const yoyUp = yoy >= 0;

  // Tendencia último mes
  const lastMonth = data[data.length - 1];
  const prevMonth = data[data.length - 2];
  const mom = prevMonth.amount > 0 ? ((lastMonth.amount - prevMonth.amount) / prevMonth.amount) * 100 : 0;
  const momUp = mom >= 0;

  const totalAll = data.reduce((s, m) => s + m.amount, 0);

  // Meta: superar total 2025
  // El año 2026 tiene 12 meses; ya llevamos m2026.length meses
  const remainingMonths2026 = 12 - m2026.length;
  const neededToBeat2025 = Math.max(sum2025 - sum2026, 0);
  const neededPerMonth = remainingMonths2026 > 0 ? neededToBeat2025 / remainingMonths2026 : 0;
  const gapPerMonth = neededPerMonth - avg2026;
  const gapPct = avg2026 > 0 ? (gapPerMonth / avg2026) * 100 : 0;
  const alreadyBeat = sum2026 >= sum2025;
  const progressPct = Math.min((sum2026 / sum2025) * 100, 100);

  // Nota: abril 2025 fue outlier — sin él el promedio 2025 baja ~14%
  const m2025WithoutBest = m2025.filter((m) => m.amount !== Math.max(...m2025.map((x) => x.amount)));
  const avg2025NoBest = m2025WithoutBest.length > 0
    ? m2025WithoutBest.reduce((s, m) => s + m.amount, 0) / m2025WithoutBest.length
    : avg2025;
  const yoyNoBest = avg2025NoBest > 0 ? ((avg2026 - avg2025NoBest) / avg2025NoBest) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <Target size={18} className="text-[#3c93d6]" />
        <h2 className="font-semibold text-gray-900">Proyecciones y flujo</h2>
      </div>

      {/* Comparativa 2025 vs 2026 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">

        {/* 2025 recap */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            2025 — abr a dic ({m2025.length} meses)
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Total ventas</span>
              <span className="font-bold text-gray-900">{fmt(sum2025)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Promedio mensual</span>
              <span className="font-semibold text-gray-700">{fmt(avg2025)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Comisiones</span>
              <span className="font-semibold text-[#3c93d6]">{fmt(com2025)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">% comisión</span>
              <span className="text-gray-500">{sum2025 > 0 ? ((com2025 / sum2025) * 100).toFixed(1) : "—"}%</span>
            </div>
          </div>
        </div>

        {/* 2026 actual */}
        <div className="bg-[#ddeef9]/50 rounded-xl p-4 border border-[#3c93d6]/20">
          <p className="text-xs font-semibold text-[#3c93d6] uppercase tracking-wide mb-3">
            2026 — ene a may ({m2026.length} meses)
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Total ventas</span>
              <span className="font-bold text-gray-900">{fmt(sum2026)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Promedio mensual</span>
              <span className="font-semibold text-gray-700">{fmt(avg2026)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Comisiones</span>
              <span className="font-semibold text-[#3c93d6]">{fmt(com2026)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">% comisión</span>
              <span className="text-gray-500">{sum2026 > 0 ? ((com2026 / sum2026) * 100).toFixed(1) : "—"}%</span>
            </div>
          </div>
        </div>

        {/* Proyección 2026 anual */}
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">
            Proyección 2026 (prom × 12)
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Ventas proyectadas</span>
              <span className="font-bold text-green-900">{fmt(proj2026)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Comisiones proyectadas</span>
              <span className="font-semibold text-[#3c93d6]">{fmt(projCom2026)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-green-100">
              <span className="text-xs text-gray-500">vs prom mensual 2025</span>
              <span className={`font-bold text-sm ${yoyUp ? "text-green-600" : "text-red-500"}`}>
                {yoyUp ? "+" : ""}{yoy.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meta 2026: superar 2025 */}
      <div className="rounded-2xl border-2 border-[#3c93d6]/30 bg-gradient-to-br from-[#ddeef9]/60 to-white p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="font-bold text-gray-900">Meta 2026: superar {fmt(sum2025)}</h3>
          </div>
          {!alreadyBeat && (
            <span className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 font-medium">
              {remainingMonths2026} meses restantes
            </span>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>2026 acumulado: <strong className="text-gray-800">{fmt(sum2026)}</strong></span>
            <span className="font-semibold text-[#3c93d6]">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden relative">
            <div
              className="h-5 rounded-full bg-gradient-to-r from-[#3c93d6] to-[#22c55e] transition-all flex items-center justify-end pr-2"
              style={{ width: `${progressPct}%` }}
            >
              {progressPct > 15 && (
                <span className="text-[10px] font-bold text-white">{progressPct.toFixed(0)}%</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0</span>
            <span>Meta: {fmt(sum2025)}</span>
          </div>
        </div>

        {alreadyBeat ? (
          <div className="bg-green-100 rounded-xl p-3 text-center">
            <p className="text-green-700 font-bold text-sm">🏆 ¡Ya superaste tu total de 2025!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Faltan</p>
              <p className="text-lg font-bold text-gray-900">{fmt(neededToBeat2025)}</p>
              <p className="text-[10px] text-gray-400">en {remainingMonths2026} meses</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-[#3c93d6]/30 text-center">
              <p className="text-[10px] text-[#3c93d6] uppercase tracking-wide mb-1">Necesitas por mes</p>
              <p className="text-lg font-bold text-[#1a5f8a]">{fmt(neededPerMonth)}</p>
              <p className="text-[10px] text-gray-400">vs tu promedio actual {fmt(avg2026)}</p>
            </div>
            <div className={`rounded-xl p-3 border text-center ${gapPct <= 20 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-100"}`}>
              <p className={`text-[10px] uppercase tracking-wide mb-1 ${gapPct <= 20 ? "text-amber-600" : "text-red-500"}`}>
                Brecha a cerrar
              </p>
              <p className={`text-lg font-bold ${gapPct <= 20 ? "text-amber-700" : "text-red-700"}`}>
                +{gapPct.toFixed(0)}% / mes
              </p>
              <p className={`text-[10px] ${gapPct <= 20 ? "text-amber-500" : "text-red-400"}`}>
                {gapPct <= 20 ? "¡Está al alcance!" : fmt(gapPerMonth) + " más/mes"}
              </p>
            </div>
          </div>
        )}

        {/* Nota sobre el outlier de abril 2025 */}
        <p className="text-[10px] text-gray-400 mt-3">
          * El -31% vs 2025 incluye abr 25 (tu mes histórico: {fmt(Math.max(...m2025.map(m => m.amount)))}). Sin ese outlier, tu promedio 2025 es {fmt(avg2025NoBest)} y la brecha 2026 es solo {yoyNoBest >= 0 ? "+" : ""}{yoyNoBest.toFixed(1)}%.
        </p>
      </div>

      {/* Tendencia MoM */}
      <div className={`rounded-xl p-4 flex items-center gap-4 ${momUp ? "bg-emerald-50" : "bg-red-50"}`}>
        {momUp ? <TrendingUp size={24} className="text-emerald-500 shrink-0" /> : <TrendingDown size={24} className="text-red-400 shrink-0" />}
        <div>
          <p className={`text-xs font-medium ${momUp ? "text-emerald-600" : "text-red-500"}`}>Tendencia último mes</p>
          <p className={`text-xl font-bold ${momUp ? "text-emerald-800" : "text-red-700"}`}>
            {momUp ? "+" : ""}{mom.toFixed(1)}%
          </p>
          <p className={`text-xs mt-0.5 ${momUp ? "text-emerald-500" : "text-red-400"}`}>
            {lastMonth.label} ({fmt(lastMonth.amount)}) vs {prevMonth.label} ({fmt(prevMonth.amount)})
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── New Sale Modal ──────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_SALE = {
  saleDate: TODAY,
  travelDate: "",
  product: "",
  detail: "",
  checkIn: "",
  checkOut: "",
  status: "Emitida",
  paymentStatus: "",
  amount: "",
  currency: "CLP",
  commission: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  partner: "",
  notes: "",
};

function NewSaleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_SALE });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    if (!form.product.trim()) { setError("El producto es obligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        amount: parseFloat(String(form.amount).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0,
        commission: parseFloat(String(form.commission).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0,
      };
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { setError("Error al guardar. Intenta de nuevo."); }
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={(form as Record<string, string>)[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Nueva venta</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Producto */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Producto *</label>
            <input
              type="text"
              value={form.product}
              onChange={(e) => set("product", e.target.value)}
              placeholder="Ej: Hotel Patagonia 4N/5D"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Detalle</label>
            <input
              type="text"
              value={form.detail}
              onChange={(e) => set("detail", e.target.value)}
              placeholder="Descripción adicional"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            {field("Fecha de venta", "saleDate", "date")}
            {field("Fecha de viaje", "travelDate", "date")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Check in", "checkIn", "date")}
            {field("Check out", "checkOut", "date")}
          </div>

          {/* Estado y pago */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
              >
                <option>Emitida</option>
                <option>En proceso</option>
                <option>Concluida</option>
                <option>Cancelada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Medio de pago</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => set("paymentStatus", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
              >
                <option value="">— Seleccionar —</option>
                <option>GP</option>
                <option>TC</option>
                <option>TD</option>
                <option>PR</option>
                <option>PR+TC</option>
                <option>Pendiente</option>
              </select>
            </div>
          </div>

          {/* Montos */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
              >
                <option>CLP</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comisión</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.commission}
                onChange={(e) => set("commission", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
              />
            </div>
          </div>

          {/* Cliente */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos del cliente</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Nombre", "clientName", "text", "Nombre completo")}
              {field("Email", "clientEmail", "email", "correo@ejemplo.com")}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {field("Teléfono", "clientPhone", "tel", "+56 9 ...")}
              {field("Partner / Agencia", "partner", "text", "Nombre del agente")}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c93d6] resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>

        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-lg hover:bg-[#2d7dbf] disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar venta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Modal ────────────────────────────────────────────────────────────

function ImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{
    headers: string[];
    colMap: Record<string, number>;
    rows: unknown[][];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [clearFirst, setClearFirst] = useState(true);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setFile(f);
    setError("");
    setParsed(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/sales/parse-excel", { method: "POST", body: fd });
      if (!res.ok) throw new Error("parse failed");
      const { rows: allRows } = await res.json() as { rows: string[][] };
      if (!allRows || allRows.length < 2) {
        setError("El archivo no tiene suficientes filas.");
        return;
      }
      const headers = allRows[0].map(String);
      const colMap = detectColumns(headers);
      const dataRows = allRows.slice(1).filter((r) => r.some((c) => c !== ""));
      setParsed({ headers, colMap, rows: dataRows });
    } catch {
      setError("No se pudo leer el archivo. Asegúrate que es .xlsx, .xls o .csv válido.");
    }
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    const sales = mapRows(parsed.rows, parsed.colMap);
    try {
      const res = await fetch("/api/sales/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales, clearFirst }),
      });
      if (res.ok) {
        onImported();
        onClose();
      } else {
        setError("Error al importar. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setImporting(false);
    }
  }

  const preview = parsed ? mapRows(parsed.rows.slice(0, 3), parsed.colMap) : [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Importar ventas desde Excel</h2>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              parsed ? "border-[#3c93d6] bg-[#ddeef9]/30" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <FileSpreadsheet size={28} className={`mx-auto mb-2 ${parsed ? "text-[#3c93d6]" : "text-gray-400"}`} />
            {file ? (
              <p className="text-sm font-medium text-[#3c93d6]">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Haz clic para seleccionar tu archivo</p>
                <p className="text-xs text-gray-400 mt-1">Formatos: .xlsx, .xls, .csv</p>
              </>
            )}
          </div>

          {parsed && (
            <>
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-green-800">{parsed.rows.length} filas encontradas</span>
                <span className="text-xs text-green-600">{Object.keys(parsed.colMap).length} columnas detectadas</span>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Mapeo de columnas detectado:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(FIELD_LABELS).map(([field, label]) => {
                    const idx = parsed.colMap[field];
                    const found = idx !== undefined;
                    return (
                      <div key={field} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${found ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-400"}`}>
                        <span className="font-medium">{label}</span>
                        <span className="truncate ml-2 max-w-[130px] text-right">
                          {found ? `"${parsed.headers[idx]}"` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Vista previa (primeras 3 filas):</p>
                <div className="border border-gray-100 rounded-lg overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Fecha venta", "Producto", "Estado", "M. de pago", "Monto", "Comisión", "Pasajero"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">{row.saleDate || "—"}</td>
                          <td className="px-3 py-2 max-w-[140px] truncate text-gray-900">{row.product || "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.status ? (
                              <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(row.status)}`}>
                                {row.status}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.paymentStatus ? (
                              <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(row.paymentStatus)}`}>
                                {row.paymentStatus}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-medium">
                            {row.amount > 0 ? formatCurrency(row.amount, row.currency || "CLP") : "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-[#3c93d6]">
                            {row.commission > 0 ? formatCurrency(row.commission, row.currency || "CLP") : "—"}
                          </td>
                          <td className="px-3 py-2 max-w-[120px] truncate text-gray-600">{row.clientName || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-between p-5 border-t">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clearFirst}
              onChange={(e) => setClearFirst(e.target.checked)}
              className="w-4 h-4 rounded accent-[#3c93d6]"
            />
            <span className="text-sm text-gray-600">
              Reemplazar datos existentes
            </span>
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
            {parsed && (
              <button onClick={handleImport} disabled={importing}
                className="px-5 py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-lg hover:bg-[#2d7dbf] disabled:opacity-50">
                {importing ? "Importando..." : `Importar ${parsed.rows.length} ventas`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [hideCancelled, setHideCancelled] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showNewSale, setShowNewSale] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showSalesTable, setShowSalesTable] = useState(true);
  const [masked, setMasked] = useState(false);
  const [syncState, setSyncState] = useState<
    "idle" | "loading" | "preview" | "done"
  >("idle");
  const [syncResult, setSyncResult] = useState<{
    created: number;
    skipped: number;
    debug?: { totalSales: number; salesWithName: number; uniqueClients: number; agentEmailsDetected: string[] };
  } | null>(null);

  async function fetchSales() {
    try {
      const res = await fetch("/api/sales");
      const data = res.ok ? await res.json() : [];
      setSales(Array.isArray(data) ? data : []);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSales(); }, []);

  async function handleSeed() {
    if (!confirm("Esto borrará todos los datos actuales y cargará las 70 ventas confirmadas. ¿Continuar?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/sales/seed", { method: "POST" });
      if (res.ok) await fetchSales();
    } finally {
      setSeeding(false);
    }
  }

  async function handleSync() {
    setSyncState("loading");
    try {
      const res = await fetch("/api/sales/sync-contacts", { method: "POST" });
      const data = res.ok ? await res.json() : null;
      if (data) {
        setSyncResult(data);
        setSyncState("done");
      } else {
        setSyncState("idle");
      }
    } catch {
      setSyncState("idle");
    }
  }

  const primaryCurrency = sales.find((s) => s.currency)?.currency || "CLP";

  const isCancelled = (s: Sale) => s.status.toLowerCase().includes("cancelad");

  const activeSales = hideCancelled ? sales.filter((s) => !isCancelled(s)) : sales;
  const cancelledCount = sales.filter(isCancelled).length;

  const statuses = [...new Set(activeSales.map((s) => s.status).filter(Boolean))];
  const paymentStatuses = [...new Set(activeSales.map((s) => s.paymentStatus).filter(Boolean))];

  const sortedActive = [...activeSales].sort((a, b) => {
    const da = a.saleDate || a.createdAt || "";
    const db = b.saleDate || b.createdAt || "";
    return db.localeCompare(da);
  });

  const filtered = sortedActive.filter((s) => {
    const matchSearch =
      !search ||
      s.product.toLowerCase().includes(search.toLowerCase()) ||
      s.clientName.toLowerCase().includes(search.toLowerCase()) ||
      s.detail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchPayment = paymentFilter === "all" || s.paymentStatus === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const totalAmount = activeSales.reduce((s, v) => s + v.amount, 0);
  const totalCommission = activeSales.reduce((s, v) => s + v.commission, 0);
  const emitidas = sales.filter((s) => s.status.toLowerCase().includes("emitid"));
  const canceladas = sales.filter((s) => s.status.toLowerCase().includes("cancelad"));

  const fmt = (v: number) => formatCurrency(v, primaryCurrency);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#3c93d6] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeSales.length} registros · {masked ? "••••••" : fmt(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#3c93d6] text-[#3c93d6] text-sm font-medium rounded-xl hover:bg-[#ddeef9] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={seeding ? "animate-spin" : ""} />
            {seeding ? "Cargando..." : "Cargar datos reales"}
          </button>
          {sales.length > 0 && (
            <button
              onClick={() => setSyncState("preview")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              <UserPlus size={16} /> Crear contactos
            </button>
          )}
          <button
            onClick={() => setShowNewSale(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-xl hover:bg-[#2d7dbf] transition-colors"
          >
            <Plus size={16} /> Nueva venta
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Upload size={16} /> Importar Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Ventas", value: activeSales.length, icon: <TrendingUp size={18} />, color: "bg-[#ddeef9] text-[#3c93d6]" },
          { label: "Ingresos Totales", value: masked ? "••••••" : fmt(totalAmount), icon: <DollarSign size={18} />, color: "bg-green-50 text-green-600" },
          { label: "Comisiones", value: masked ? "••••••" : fmt(totalCommission), icon: <Percent size={18} />, color: "bg-[#f0fde4] text-[#5a9e00]" },
          { label: "Emitidas / Canceladas", value: `${emitidas.length} / ${canceladas.length}`, icon: <CheckCircle size={18} />, color: "bg-emerald-50 text-emerald-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics */}
      {sales.length > 0 && (
        <AnalyticsPanel sales={sales} currency={primaryCurrency} masked={masked} onToggleMask={() => setMasked(v => !v)} />
      )}

      {/* Projections */}
      {sales.length > 0 && (
        <ProjectionsPanel sales={sales} currency={primaryCurrency} />
      )}

      {/* Table header toggle + filters */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowSalesTable((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          {showSalesTable ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          Detalle de ventas
          <span className="text-xs font-normal text-gray-400">({filtered.length} registros)</span>
        </button>
      </div>

      {showSalesTable && <><div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, cliente..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3c93d6]"
          />
        </div>
        {statuses.length > 0 && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3c93d6]">
            <option value="all">Todos los estados</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {paymentStatuses.length > 0 && (
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3c93d6]">
            <option value="all">Estado de pago</option>
            {paymentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {cancelledCount > 0 && (
          <button onClick={() => setHideCancelled((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${
              hideCancelled
                ? "border-gray-200 text-gray-500 hover:border-gray-300"
                : "border-red-200 bg-red-50 text-red-600"
            }`}>
            <span className={`w-2 h-2 rounded-full ${hideCancelled ? "bg-gray-300" : "bg-red-400"}`} />
            {hideCancelled ? `Mostrar canceladas (${cancelledCount})` : `Ocultar canceladas (${cancelledCount})`}
          </button>
        )}
      </div>

      {/* Table */}

      {sales.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <FileSpreadsheet size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay ventas importadas aún</p>
          <p className="text-sm text-gray-400 mt-1">Usa el botón "Importar Excel" para cargar tus datos</p>
          <button onClick={() => setShowImport(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-xl hover:bg-[#2d7dbf]">
            <Upload size={15} /> Importar Excel
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Fecha venta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Check in → out</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Comisión</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No se encontraron resultados</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.saleDate || s.travelDate || "—"}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium text-gray-900 truncate">{s.product || "—"}</p>
                      {s.detail && <p className="text-xs text-gray-400 truncate">{s.detail}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {s.checkIn && s.checkOut
                        ? `${s.checkIn} → ${s.checkOut}`
                        : s.checkIn || s.checkOut || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.status ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>{s.status}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.paymentStatus ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.paymentStatus)}`}>{s.paymentStatus}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap text-right">
                      {s.amount > 0 ? fmt(s.amount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[#3c93d6] whitespace-nowrap text-right">
                      {s.commission > 0 ? fmt(s.commission) : "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-gray-900 truncate">{s.clientName || "—"}</p>
                      {s.clientEmail && <p className="text-xs text-gray-400 truncate">{s.clientEmail}</p>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      </>}

      {showNewSale && (
        <NewSaleModal onClose={() => setShowNewSale(false)} onSaved={fetchSales} />
      )}

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={fetchSales} />
      )}

      {(syncState === "preview" || syncState === "loading" || syncState === "done") && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            {syncState === "done" && syncResult ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-green-50 rounded-xl">
                    <UserPlus size={20} className="text-green-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900">Contactos creados</h2>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-3">
                    <span className="text-sm text-green-800">Contactos nuevos creados</span>
                    <span className="text-xl font-bold text-green-700">{syncResult.created}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <span className="text-sm text-gray-600">Ya existían</span>
                    <span className="text-xl font-bold text-gray-500">{syncResult.skipped}</span>
                  </div>
                </div>
                {syncResult.debug && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
                    <p>Ventas leídas: <strong>{syncResult.debug.totalSales}</strong></p>
                    <p>Con nombre: <strong>{syncResult.debug.salesWithName}</strong></p>
                    <p>Clientes únicos: <strong>{syncResult.debug.uniqueClients}</strong></p>
                  </div>
                )}
                <button
                  onClick={() => { setSyncState("idle"); setSyncResult(null); }}
                  className="w-full py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-lg hover:bg-[#2d7dbf]"
                >
                  Cerrar
                </button>
              </>
            ) : syncState === "preview" ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-[#ddeef9] rounded-xl">
                    <UserPlus size={20} className="text-[#3c93d6]" />
                  </div>
                  <h2 className="font-semibold text-gray-900">Crear contactos</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Se crearán contactos únicos a partir de los{" "}
                  <span className="font-semibold">{activeSales.length} registros</span> de ventas.
                  Los clientes que ya existan en la base de datos no se duplicarán.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSyncState("idle")}
                    className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSync}
                    className="flex-1 py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-lg hover:bg-[#2d7dbf]"
                  >
                    Crear contactos
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="animate-spin w-8 h-8 border-4 border-[#3c93d6] border-t-transparent rounded-full" />
                <p className="text-sm text-gray-500">Creando contactos...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
