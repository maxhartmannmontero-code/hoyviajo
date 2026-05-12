"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { Plus, Trash2, X, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Expense, ExpenseCategory, Sale } from "@/types";

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; color: string; bg: string }> = {
  bni:           { label: "BNI",           color: "#3b82f6", bg: "bg-blue-100 text-blue-700"   },
  publicidad:    { label: "Publicidad",    color: "#f97316", bg: "bg-orange-100 text-orange-700" },
  comunicaciones:{ label: "Comunicaciones",color: "#8b5cf6", bg: "bg-purple-100 text-purple-700" },
  traslados:     { label: "Traslados",     color: "#eab308", bg: "bg-yellow-100 text-yellow-700" },
  servicios:     { label: "Servicios dig.",color: "#6b7280", bg: "bg-gray-100 text-gray-700"   },
  otros:         { label: "Otros",         color: "#14b8a6", bg: "bg-teal-100 text-teal-700"   },
};

const PRESET_EXPENSES: { category: ExpenseCategory; description: string; amount: number }[] = [
  { category: "bni",    description: "BNI membresía mensual",      amount: 59500  },
  { category: "bni",    description: "BNI traslado + desayuno",    amount: 80000  },
  { category: "comunicaciones", description: "Celular / internet", amount: 30000  },
];

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

// ─── Helpers ───────────────────────────────────────────────────────────────

function currentMonth() { return new Date().toISOString().slice(0, 7); }

function allMonths(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2025, 3 + i, 1);
    return d.toISOString().slice(0, 7);
  }).reverse();
}

function monthLabel(m: string) {
  return new Date(m + "-15").toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
}

function monthLong(m: string) {
  return new Date(m + "-15").toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

// ─── AddExpenseModal ────────────────────────────────────────────────────────

function AddExpenseModal({
  month,
  onClose,
  onSave,
}: {
  month: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<{ category: ExpenseCategory; description: string; amount: string }>({
    category: "otros",
    description: "",
    amount: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.description || !form.amount) return;
    setSaving(true);
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, ...form, amount: parseFloat(form.amount) || 0 }),
      });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function addPreset(preset: (typeof PRESET_EXPENSES)[number]) {
    setSaving(true);
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, ...preset }),
      });
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Agregar gasto — {monthLong(month)}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gastos frecuentes</p>
            <div className="space-y-2">
              {PRESET_EXPENSES.map((p, i) => (
                <button key={i} onClick={() => addPreset(p)} disabled={saving}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded-xl text-sm transition-colors disabled:opacity-50">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_CONFIG[p.category].bg}`}>
                      {CATEGORY_CONFIG[p.category].label}
                    </span>
                    <span className="text-gray-700">{p.description}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{fmtCLP(p.amount)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Gasto personalizado</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                <select value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((k) => (
                    <option key={k} value={k}>{CATEGORY_CONFIG[k].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                <input value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Campaña Meta Ads junio"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Monto (CLP)</label>
                <input type="number" min={0} value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="150000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleSave} disabled={saving || !form.description || !form.amount}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
                <Check size={15} /> {saving ? "Guardando..." : "Agregar gasto"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

function CashFlowTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-semibold">{fmtCLP(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth());
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchData() {
    const [exp, sal] = await Promise.all([
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/sales").then((r) => r.json()),
    ]);
    setExpenses(Array.isArray(exp) ? exp : []);
    setSales(Array.isArray(sal) ? sal : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      await fetchData();
    } finally {
      setDeleting(null);
    }
  }

  // ─── Monthly commission income from sales ────────────────────────────────

  function monthlyIncome(ym: string): number {
    return sales
      .filter((s) => {
        const date = s.saleDate || s.createdAt || "";
        return date.startsWith(ym) && s.status.toLowerCase().includes("emitid");
      })
      .reduce((sum, s) => sum + s.commission, 0);
  }

  // ─── Current month stats ─────────────────────────────────────────────────

  const monthExpenses = expenses.filter((e) => e.month === month);
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = monthlyIncome(month);
  const netProfit = totalIncome - totalExpenses;

  // Expenses grouped by category for current month
  const byCategory = (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[])
    .map((cat) => ({
      cat,
      total: monthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total > 0);

  // ─── Cash flow chart data (last 12 months) ───────────────────────────────

  const chartMonths = allMonths().slice(0, 12).reverse();
  const chartData = chartMonths.map((m) => {
    const inc = monthlyIncome(m);
    const exp = expenses.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0);
    return {
      label: monthLabel(m),
      Comisiones: inc,
      Gastos: exp,
      Neto: inc - exp,
    };
  });

  // ─── ROI by channel ──────────────────────────────────────────────────────

  const totalBNICost = expenses
    .filter((e) => e.category === "bni")
    .reduce((s, e) => s + e.amount, 0);
  const totalAdsSpend = expenses
    .filter((e) => e.category === "publicidad")
    .reduce((s, e) => s + e.amount, 0);
  const totalCommissions = sales
    .filter((s) => s.status.toLowerCase().includes("emitid"))
    .reduce((s, sale) => s + sale.commission, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos & Flujo de Caja</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresos vs. egresos → rentabilidad real</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {allMonths().map((m) => (
              <option key={m} value={m}>{monthLong(m)}</option>
            ))}
          </select>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
            <Plus size={15} /> Agregar gasto
          </button>
        </div>
      </div>

      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-50 rounded-xl"><TrendingUp size={18} className="text-green-600" /></div>
            <span className="text-sm text-gray-500">Comisiones recibidas</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{fmtCLP(totalIncome)}</p>
          <p className="text-xs text-gray-400 mt-1">{monthLong(month)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-50 rounded-xl"><TrendingDown size={18} className="text-red-500" /></div>
            <span className="text-sm text-gray-500">Total gastos</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{fmtCLP(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-1">{monthExpenses.length} registros</p>
        </div>

        <div className={`rounded-2xl border shadow-sm p-5 ${netProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-xl ${netProfit >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
              <Minus size={18} className={netProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
            </div>
            <span className="text-sm text-gray-600">Resultado neto</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {fmtCLP(netProfit)}
          </p>
          {totalIncome > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Margen: {Math.round((netProfit / totalIncome) * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* ─── Chart ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Flujo de caja — últimos 12 meses</h3>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
            <Tooltip content={<CashFlowTooltip />} />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Bar dataKey="Comisiones" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.85} />
            <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.75} />
            <Line dataKey="Neto" name="Neto" type="monotone" stroke="#1d6fa8" strokeWidth={2.5}
              dot={{ fill: "#1d6fa8", r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-2 justify-center">
          {[
            { color: "bg-green-500", label: "Comisiones" },
            { color: "bg-red-400", label: "Gastos" },
            { color: "bg-blue-700", label: "Neto", line: true },
          ].map(({ color, label, line }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
              {line
                ? <div className="w-6 h-0.5 bg-blue-700 rounded" />
                : <div className={`w-3 h-3 rounded-sm ${color}`} />}
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ─── Expense list ────────────────────────────────────────────── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              Gastos de {monthLong(month)}
            </h3>
            <button onClick={() => setShowAdd(true)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Plus size={12} /> Agregar
            </button>
          </div>

          {monthExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No hay gastos registrados para este mes.</p>
              <button onClick={() => setShowAdd(true)}
                className="mt-2 text-xs text-blue-600 hover:underline">
                + Agregar primero los gastos fijos (BNI, celular...)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {monthExpenses
                .sort((a, b) => b.amount - a.amount)
                .map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_CONFIG[e.category].bg}`}>
                      {CATEGORY_CONFIG[e.category].label}
                    </span>
                    <span className="text-sm text-gray-700 flex-1">{e.description}</span>
                    <span className="font-semibold text-gray-800 text-sm">{fmtCLP(e.amount)}</span>
                    <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              <div className="flex justify-between pt-2 text-sm font-semibold text-gray-700 border-t border-gray-200">
                <span>Total</span>
                <span className="text-red-600">{fmtCLP(totalExpenses)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Breakdown + ROI ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {byCategory.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Por categoría</h3>
              <div className="space-y-2">
                {byCategory.map(({ cat, total }) => {
                  const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`px-2 py-0.5 rounded-full ${CATEGORY_CONFIG[cat].bg}`}>
                          {CATEGORY_CONFIG[cat].label}
                        </span>
                        <span className="font-semibold text-gray-700">{fmtCLP(total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: CATEGORY_CONFIG[cat].color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">ROI de canales</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="font-medium text-blue-800 mb-0.5">BNI</p>
                <p className="text-xs text-blue-600">Costo registrado: {fmtCLP(totalBNICost)}</p>
                <p className="text-xs text-blue-600">
                  Comisiones totales: {fmtCLP(Math.round(totalCommissions * 0.6))}
                  <span className="opacity-60"> (≈60% del total)</span>
                </p>
                {totalBNICost > 0 && (
                  <p className="text-xs font-semibold text-blue-800 mt-1">
                    ROI: {Math.round((totalCommissions * 0.6) / totalBNICost)}x
                  </p>
                )}
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <p className="font-medium text-orange-800 mb-0.5">Meta / Google Ads</p>
                <p className="text-xs text-orange-600">Costo registrado: {fmtCLP(totalAdsSpend)}</p>
                {totalAdsSpend === 0 && (
                  <p className="text-xs text-orange-500 italic">
                    Dato piloto: $150k → $450k comisión (3x ROI)
                  </p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="font-medium text-gray-700 mb-0.5 text-xs">Gastos fijos est./mes</p>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div className="flex justify-between"><span>BNI membresía</span><span>$59.500</span></div>
                  <div className="flex justify-between"><span>BNI traslados</span><span>$80.000</span></div>
                  <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t border-gray-200">
                    <span>Total fijo</span><span>$139.500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddExpenseModal month={month} onClose={() => setShowAdd(false)} onSave={fetchData} />
      )}
    </div>
  );
}
