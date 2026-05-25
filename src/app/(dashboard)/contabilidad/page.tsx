"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Receipt, TrendingUp, TrendingDown, PiggyBank, Calculator,
  Plus, Trash2, ChevronLeft, ChevronRight, AlertCircle, CheckCircle,
} from "lucide-react";
import { Sale, Expense, Invoice } from "@/types";

const IVA_RATE = 0.19;
const PPM_RATE = 0.02;
const RENTA_RATE = 0.25;

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

function getMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function prevMonth(ym: string) {
  const d = new Date(ym + "-01");
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
function nextMonth(ym: string) {
  const d = new Date(ym + "-01");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

const EMPTY_FORM = {
  provider: "",
  number: "",
  date: "",
  amount: "",
  description: "",
  exenta: false,
};

// ── TaxCard ─────────────────────────────────────────────────────────────────
function TaxCard({
  icon, label, value, sub, color = "text-gray-900", highlight = false,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border ${highlight ? "border-orange-200 bg-orange-50" : "border-gray-100"}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[12px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-bold text-gray-800">{title}</h2>
      {sub && <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContabilidadPage() {
  const today = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(today);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, e, i] = await Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/facturas").then((r) => r.json()),
    ]);
    setSales(Array.isArray(s) ? s : []);
    setExpenses(Array.isArray(e) ? e : []);
    setInvoices(Array.isArray(i) ? i : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Calculations ────────────────────────────────────────────────────────────

  const salesOfMonth = sales.filter((s) => {
    const ref = s.saleDate || s.createdAt || "";
    return ref.slice(0, 7) === selectedMonth;
  });

  const commissionsGross = salesOfMonth.reduce((a, s) => a + (s.commission || 0), 0);
  const commissionsNet = commissionsGross / (1 + IVA_RATE);
  const ivaDebito = commissionsGross - commissionsNet;

  const facturasCompra = invoices.filter(
    (inv) => inv.direction === "recibida" && inv.month === selectedMonth
  );
  const ivaCredito = facturasCompra
    .filter((inv) => !inv.exenta)
    .reduce((a, inv) => a + inv.amount * IVA_RATE / (1 + IVA_RATE), 0);
  const ivaNeto = Math.max(ivaDebito - ivaCredito, 0);

  const ppmBase = commissionsNet;
  const ppmAmount = ppmBase * PPM_RATE;

  const expensesOfMonth = expenses.filter((e) => e.month === selectedMonth);
  const expensesTotal = expensesOfMonth.reduce((a, e) => a + e.amount, 0);

  // YTD para provisión renta
  const currentYear = selectedMonth.slice(0, 4);
  const monthsElapsed = parseInt(selectedMonth.slice(5, 7));

  const ytdSales = sales.filter((s) => {
    const ref = s.saleDate || s.createdAt || "";
    return ref.startsWith(currentYear);
  });
  const ytdCommissionsGross = ytdSales.reduce((a, s) => a + (s.commission || 0), 0);
  const ytdCommissionsNet = ytdCommissionsGross / (1 + IVA_RATE);

  const ytdExpenses = expenses
    .filter((e) => e.month?.startsWith(currentYear))
    .reduce((a, e) => a + e.amount, 0);

  const ytdUtilidadNeta = ytdCommissionsNet - ytdExpenses;
  const estimatedAnnualUtilidad = monthsElapsed > 0
    ? (ytdUtilidadNeta / monthsElapsed) * 12
    : 0;
  const estimatedAnnualTax = Math.max(estimatedAnnualUtilidad * RENTA_RATE, 0);

  const ytdPPMPaid = (ytdCommissionsNet) * PPM_RATE;
  const taxGap = Math.max(estimatedAnnualTax - ytdPPMPaid, 0);
  const monthsRemaining = Math.max(12 - monthsElapsed + 1, 1);
  const monthlyProvision = taxGap / monthsRemaining;

  const flujoReal = commissionsGross - ivaNeto - ppmAmount - expensesTotal - monthlyProvision;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!form.provider || !form.amount || !form.date) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("direction", "recibida");
    fd.append("month", selectedMonth);
    fd.append("number", form.number);
    fd.append("provider", form.provider);
    fd.append("amount", form.amount);
    fd.append("currency", "CLP");
    fd.append("date", form.date);
    fd.append("description", form.description);
    fd.append("notes", "");
    fd.append("exenta", String(form.exenta));
    fd.append("file", new Blob([], { type: "application/octet-stream" }), "sin-archivo.txt");

    await fetch("/api/facturas", { method: "POST", body: fd });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/facturas/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Cargando datos...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Contabilidad</h1>
          <p className="text-sm text-gray-400 mt-1">Impuestos y flujo real · Hoy Viajo CRM</p>
        </div>
        {/* Month selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <button
            onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[14px] font-semibold text-gray-700 min-w-[130px] text-center">
            {getMonthLabel(selectedMonth)}
          </span>
          <button
            onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            disabled={selectedMonth >= today}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── IVA ─────────────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="IVA del mes"
          sub="Formulario 29 · declaración mensual"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TaxCard
            icon={<TrendingUp size={15} className="text-red-500" />}
            label="Débito fiscal"
            value={fmtCLP(ivaDebito)}
            sub={`IVA de ${fmtCLP(commissionsGross)} en comisiones`}
            color="text-red-600"
          />
          <TaxCard
            icon={<TrendingDown size={15} className="text-green-500" />}
            label="Crédito fiscal"
            value={fmtCLP(ivaCredito)}
            sub={`${facturasCompra.filter((i) => !i.exenta).length} facturas de compra afectas`}
            color="text-green-600"
          />
          <TaxCard
            icon={<Receipt size={15} className="text-orange-500" />}
            label="IVA neto a pagar"
            value={fmtCLP(ivaNeto)}
            sub="Débito − crédito fiscal"
            color="text-orange-600"
            highlight
          />
        </div>
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[12px] text-blue-700">
          <strong>Comisión neta (sin IVA):</strong> {fmtCLP(commissionsNet)}
          {" · "}
          <strong>Comisión bruta (con IVA):</strong> {fmtCLP(commissionsGross)}
          {" · "}
          <strong>Ventas brutas del período:</strong> {fmtCLP(salesOfMonth.reduce((a, s) => a + s.amount, 0))}
        </div>
      </section>

      {/* ── PPM ─────────────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="PPM del mes"
          sub={`Pago provisional mensual · tasa ${(PPM_RATE * 100).toFixed(0)}%`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TaxCard
            icon={<Calculator size={15} className="text-indigo-500" />}
            label="Base imponible PPM"
            value={fmtCLP(ppmBase)}
            sub="Comisión neta sin IVA"
            color="text-indigo-700"
          />
          <TaxCard
            icon={<Receipt size={15} className="text-indigo-500" />}
            label="PPM del mes"
            value={fmtCLP(ppmAmount)}
            sub={`${(PPM_RATE * 100).toFixed(0)}% de la base imponible`}
            color="text-indigo-700"
            highlight
          />
          <TaxCard
            icon={<TrendingUp size={15} className="text-indigo-400" />}
            label={`PPM acumulado ${currentYear}`}
            value={fmtCLP(ytdPPMPaid)}
            sub="Pagos provisionales del año"
            color="text-indigo-500"
          />
        </div>
      </section>

      {/* ── Provisión Renta ──────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title={`Provisión Impuesto a la Renta ${currentYear}`}
          sub={`Primera Categoría · tasa ${(RENTA_RATE * 100).toFixed(0)}% · pago abril ${parseInt(currentYear) + 1}`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TaxCard
            icon={<TrendingUp size={15} className="text-gray-500" />}
            label="Utilidad neta YTD"
            value={fmtCLP(ytdUtilidadNeta)}
            sub={`Comisiones netas − gastos (${monthsElapsed} meses)`}
            color="text-gray-700"
          />
          <TaxCard
            icon={<Calculator size={15} className="text-purple-500" />}
            label="Impuesto estimado anual"
            value={fmtCLP(estimatedAnnualTax)}
            sub={`${(RENTA_RATE * 100).toFixed(0)}% de utilidad proyectada`}
            color="text-purple-700"
          />
          <TaxCard
            icon={<CheckCircle size={15} className="text-green-500" />}
            label="PPM acumulado"
            value={fmtCLP(ytdPPMPaid)}
            sub="Ya cubierto con pagos provisionales"
            color="text-green-600"
          />
          <TaxCard
            icon={<PiggyBank size={15} className="text-rose-500" />}
            label="Ahorro sugerido / mes"
            value={fmtCLP(monthlyProvision)}
            sub={`Para cubrir ${fmtCLP(taxGap)} en abril ${parseInt(currentYear) + 1}`}
            color="text-rose-600"
            highlight
          />
        </div>
      </section>

      {/* ── Flujo Real ───────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Flujo real del mes"
          sub="Lo que realmente queda después de todas las obligaciones"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {[
            { label: "Comisiones brutas (con IVA)", value: commissionsGross, plus: true },
            { label: "− IVA neto a pagar", value: -ivaNeto },
            { label: "− PPM del mes", value: -ppmAmount },
            { label: "− Gastos operativos", value: -expensesTotal },
            { label: "− Provisión impuesto renta", value: -monthlyProvision },
          ].map(({ label, value, plus }, i) => (
            <div
              key={i}
              className={`flex justify-between items-center px-6 py-3.5 text-[13px] ${
                i < 4 ? "border-b border-gray-50" : ""
              }`}
            >
              <span className={plus ? "font-semibold text-gray-700" : "text-gray-500"}>{label}</span>
              <span className={`font-semibold tabular-nums ${plus ? "text-gray-900" : value < 0 ? "text-red-500" : "text-green-600"}`}>
                {plus ? "+" : ""}{fmtCLP(value)}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center px-6 py-4 bg-gray-900 mt-1">
            <span className="text-[14px] font-bold text-white">= Lo tuyo realmente</span>
            <span className={`text-[18px] font-black tabular-nums ${flujoReal >= 0 ? "text-[#ACFD46]" : "text-red-400"}`}>
              {fmtCLP(flujoReal)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Facturas de compra ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            title="Facturas de compra del mes"
            sub="Crédito fiscal IVA · facturas recibidas"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gray-900 text-white text-[13px] font-semibold px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            Agregar factura
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray-700 mb-4">Nueva factura de compra</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Proveedor *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">N° Factura</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="Ej: 12345"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Fecha *</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Monto total (con IVA si afecta) *</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Descripción</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej: Arriendo oficina, suscripción software..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setForm({ ...form, exenta: !form.exenta })}
                    className={`w-10 h-5 rounded-full transition-colors ${form.exenta ? "bg-blue-500" : "bg-gray-300"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${form.exenta ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-[13px] text-gray-600">
                    Factura <strong>exenta de IVA</strong>
                    <span className="text-gray-400 ml-1">(no genera crédito fiscal)</span>
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                disabled={saving || !form.provider || !form.amount || !form.date}
                className="bg-gray-900 text-white text-[13px] font-semibold px-5 py-2 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="text-[13px] text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {facturasCompra.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-10 text-center">
            <AlertCircle size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-[13px] text-gray-400">No hay facturas de compra registradas para este mes.</p>
            <p className="text-[12px] text-gray-300 mt-1">Agrégalas para calcular tu crédito fiscal IVA.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Proveedor</th>
                  <th className="text-left px-4 py-3 font-semibold">N°</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                  <th className="text-right px-4 py-3 font-semibold">Monto total</th>
                  <th className="text-right px-4 py-3 font-semibold">IVA crédito</th>
                  <th className="text-center px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {facturasCompra.map((inv, i) => {
                  const ivaRow = inv.exenta ? 0 : inv.amount * IVA_RATE / (1 + IVA_RATE);
                  return (
                    <tr key={inv.id} className={`border-t border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{inv.provider}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.number || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.date || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">
                        {fmtCLP(inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums">
                        {inv.exenta ? "—" : fmtCLP(ivaRow)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.exenta
                            ? "bg-gray-100 text-gray-400"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {inv.exenta ? "Exenta" : "Afecta"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deleting === inv.id}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-700 tabular-nums">
                    {fmtCLP(facturasCompra.reduce((a, i) => a + i.amount, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 tabular-nums">
                    {fmtCLP(ivaCredito)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
