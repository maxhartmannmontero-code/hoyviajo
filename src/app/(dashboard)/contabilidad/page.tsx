"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Receipt, TrendingUp, TrendingDown, PiggyBank, Calculator,
  Plus, Trash2, ChevronLeft, ChevronRight, AlertCircle, CheckCircle,
  Paperclip, Eye, Loader2, Upload, X, FileText,
  ChevronDown,
} from "lucide-react";
import { Sale, Expense, Invoice, InvoiceDirection } from "@/types";
import { useMask } from "@/lib/mask-context";

const IVA_RATE = 0.19;
const PPM_RATE = 0.02;
const RENTA_RATE = 0.25;

const _fmt = (n: number) =>
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

// ── UploadModal ──────────────────────────────────────────────────────────────
function UploadModal({ direction, onClose, onSave }: { direction: InvoiceDirection; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    number: "", provider: "", amount: "", currency: "CLP",
    date: new Date().toISOString().slice(0, 10),
    description: "", notes: "", exenta: "false",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("direction", direction);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    await fetch("/api/facturas", { method: "POST", body: fd });
    setSaving(false);
    onSave();
    onClose();
  }

  const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900 text-[14px]">
            Subir factura {direction === "emitida" ? "emitida" : "recibida"}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Archivo *</label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <p className="text-[13px] text-gray-700 font-medium">{file.name}</p>
              ) : (
                <>
                  <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-[12px] text-gray-500">Haz clic para seleccionar PDF o imagen</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Mes *</label>
              <input type="month" required value={form.month} onChange={(e) => set("month", e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Fecha factura</label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">N° factura</label>
              <input value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="001234" className={INPUT} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                {direction === "emitida" ? "Cliente" : "Proveedor"}
              </label>
              <input value={form.provider} onChange={(e) => set("provider", e.target.value)}
                placeholder={direction === "emitida" ? "Nombre cliente" : "Nombre proveedor"} className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Monto</label>
              <input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Moneda</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={INPUT}>
                <option>CLP</option><option>USD</option><option>EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Descripción</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Concepto de la factura" className={INPUT} />
          </div>
          {direction === "recibida" && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set("exenta", form.exenta === "true" ? "false" : "true")}
                className={`w-10 h-5 rounded-full transition-colors ${form.exenta === "true" ? "bg-blue-500" : "bg-gray-300"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${form.exenta === "true" ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-[13px] text-gray-600">Factura <strong>exenta de IVA</strong></span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600">Cancelar</button>
            <button type="submit" disabled={saving || !file}
              className="px-5 py-2 bg-gray-900 text-white text-[13px] font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-40">
              {saving ? "Subiendo..." : "Subir factura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MonthFolder ───────────────────────────────────────────────────────────────
function MonthFolder({ month, invoices, onDelete, onAttach, uploading }: {
  month: string; invoices: Invoice[];
  onDelete: (id: string) => void;
  onAttach: (id: string, file: File) => void;
  uploading: string | null;
}) {
  const { masked } = useMask();
  const fmtCLP = (n: number) => masked ? "•••••" : _fmt(n);
  const [open, setOpen] = useState(true);
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const [y, m] = month.split("-");
  const label = month === "sin-mes" ? "Sin mes" : `${months[parseInt(m) - 1]} ${y}`;
  const total = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="font-semibold text-gray-800 text-[13px]">{label}</span>
          <span className="text-[11px] text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">{invoices.length}</span>
        </div>
        <span className="text-[13px] font-bold text-gray-700">{fmtCLP(total)}</span>
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 group">
              <FileText size={14} className="text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-gray-800 truncate">{inv.description || inv.provider || inv.fileName}</p>
                  {inv.number && <span className="text-[11px] text-gray-400">#{inv.number}</span>}
                  {inv.exenta && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-bold">Exenta</span>}
                </div>
                {inv.provider && <p className="text-[11px] text-gray-400 truncate">{inv.provider}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {inv.amount > 0 && <p className="text-[13px] font-semibold text-gray-800">{fmtCLP(inv.amount)}</p>}
                {inv.date && <p className="text-[11px] text-gray-400">{inv.date}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading === inv.id ? (
                  <Loader2 size={13} className="animate-spin text-gray-400" />
                ) : inv.driveUrl ? (
                  <a href={inv.driveUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-blue-500 hover:text-blue-700 rounded transition-colors" title="Ver documento">
                    <Eye size={13} />
                  </a>
                ) : (
                  <label className="p-1.5 text-gray-400 hover:text-indigo-500 rounded cursor-pointer transition-colors">
                    <Paperclip size={13} />
                    <input type="file" className="hidden" accept=".pdf,.xml,.png,.jpg,.jpeg"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach(inv.id, f); }} />
                  </label>
                )}
                <button onClick={() => onDelete(inv.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TaxCard ─────────────────────────────────────────────────────────────────
function TaxCard({
  icon, label, value, sub, color = "text-gray-900", highlight = false,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: string; highlight?: boolean;
}) {
  const { masked } = useMask();
  const fmtCLP = (n: number) => masked ? "•••••" : _fmt(n);
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
  const { masked } = useMask();
  const fmtCLP = (n: number) => masked ? "•••••" : _fmt(n);
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
  const [uploading, setUploading] = useState<string | null>(null);
  const [invoiceTab, setInvoiceTab] = useState<InvoiceDirection | "calendario">("recibida");
  const [showFormEmitida, setShowFormEmitida] = useState(false);
  const [formEmitida, setFormEmitida] = useState({ provider: "", number: "", date: "", amount: "", description: "" });
  const [savingEmitida, setSavingEmitida] = useState(false);
  const [providerSuggestions, setProviderSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [descSuggestions, setDescSuggestions] = useState<string[]>([]);
  const [showDescSuggestions, setShowDescSuggestions] = useState(false);

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

  const facturasCompra = invoices.filter(
    (inv) => inv.direction === "recibida" && inv.month === selectedMonth
  );
  const facturasEmitidas = invoices.filter(
    (inv) => inv.direction === "emitida" && inv.month === selectedMonth
  );

  // Fuente de verdad fiscal: facturas emitidas (lo que ve el SII)
  const commissionsGross = facturasEmitidas.reduce((a, i) => a + i.amount, 0);
  const commissionsNet = commissionsGross / (1 + IVA_RATE);
  const ivaDebito = commissionsGross - commissionsNet;

  const ivaCredito = facturasCompra
    .filter((inv) => !inv.exenta)
    .reduce((a, inv) => a + inv.amount * IVA_RATE / (1 + IVA_RATE), 0);
  const ivaNeto = Math.max(ivaDebito - ivaCredito, 0);

  const ppmBase = commissionsNet;
  const ppmAmount = ppmBase * PPM_RATE;

  const expensesOfMonth = expenses.filter((e) => e.month === selectedMonth);
  const expensesTotal = expensesOfMonth.reduce((a, e) => a + e.amount, 0);

  // YTD desde facturas emitidas (fuente fiscal)
  const currentYear = selectedMonth.slice(0, 4);
  const monthsElapsed = parseInt(selectedMonth.slice(5, 7));

  const ytdEmitidas = invoices.filter(
    (i) => i.direction === "emitida" && i.month?.startsWith(currentYear)
  );
  const ytdCommissionsGross = ytdEmitidas.reduce((a, i) => a + i.amount, 0);
  const ytdCommissionsNet = ytdCommissionsGross / (1 + IVA_RATE);

  const ytdExpenses = expenses
    .filter((e) => e.month?.startsWith(currentYear))
    .reduce((a, e) => a + e.amount, 0);

  const ytdUtilidadNeta = ytdCommissionsNet - ytdExpenses;
  const estimatedAnnualUtilidad = monthsElapsed > 0
    ? (ytdUtilidadNeta / monthsElapsed) * 12
    : 0;
  const estimatedAnnualTax = Math.max(estimatedAnnualUtilidad * RENTA_RATE, 0);

  const ytdPPMPaid = ytdCommissionsNet * PPM_RATE;
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

  function handleProviderChange(value: string) {
    setForm({ ...form, provider: value });
    if (value.length < 2) { setShowSuggestions(false); return; }
    const known = [...new Set(invoices.map((i) => i.provider).filter(Boolean))];
    const matches = known.filter((p) => p.toLowerCase().includes(value.toLowerCase()));
    setProviderSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }

  function selectProvider(name: string) {
    setForm({ ...form, provider: name });
    setShowSuggestions(false);
  }

  function handleDescChange(value: string) {
    setForm({ ...form, description: value });
    if (value.length < 2) { setShowDescSuggestions(false); return; }
    const known = [...new Set(invoices.map((i) => i.description).filter(Boolean))];
    const matches = known.filter((d) => d.toLowerCase().includes(value.toLowerCase()));
    setDescSuggestions(matches);
    setShowDescSuggestions(matches.length > 0);
  }

  function selectDesc(desc: string) {
    setForm({ ...form, description: desc });
    setShowDescSuggestions(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/facturas/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  async function handleAddEmitida() {
    if (!formEmitida.provider || !formEmitida.amount || !formEmitida.date) return;
    setSavingEmitida(true);
    const fd = new FormData();
    fd.append("direction", "emitida");
    fd.append("month", selectedMonth);
    fd.append("number", formEmitida.number);
    fd.append("provider", formEmitida.provider);
    fd.append("amount", formEmitida.amount);
    fd.append("currency", "CLP");
    fd.append("date", formEmitida.date);
    fd.append("description", formEmitida.description);
    fd.append("notes", "");
    fd.append("exenta", "false");
    fd.append("file", new Blob([], { type: "application/octet-stream" }), "sin-archivo.txt");
    await fetch("/api/facturas", { method: "POST", body: fd });
    setFormEmitida({ provider: "", number: "", date: "", amount: "", description: "" });
    setShowFormEmitida(false);
    setSavingEmitida(false);
    load();
  }

  async function handleAttach(id: string, file: File) {
    setUploading(id);
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/facturas/${id}`, { method: "PATCH", body: fd });
    setUploading(null);
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
            sub={`IVA de ${facturasEmitidas.length} facturas emitidas del mes`}
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
          <strong>Monto neto facturas emitidas (sin IVA):</strong> {fmtCLP(commissionsNet)}
          {" · "}
          <strong>Monto bruto (con IVA):</strong> {fmtCLP(commissionsGross)}
          {" · "}
          <strong>Ventas brutas del período (referencia):</strong> {fmtCLP(salesOfMonth.reduce((a, s) => a + s.amount, 0))}
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
            { label: "Facturas emitidas del mes (con IVA)", value: commissionsGross, plus: true },
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

      {/* ── Facturas ─────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-bold text-gray-800">Facturas</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {invoiceTab === "recibida"
                ? `Crédito fiscal IVA · recibidas de ${getMonthLabel(selectedMonth)}`
                : invoiceTab === "emitida"
                ? "Facturas emitidas · todos los meses"
                : "Ciclos de facturación y pago por proveedor"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1">
              {(["recibida", "emitida", "calendario"] as const).map((t) => (
                <button key={t} onClick={() => setInvoiceTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                    invoiceTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {t === "recibida" ? "Recibidas" : t === "emitida" ? "Emitidas" : "Calendario"}
                </button>
              ))}
            </div>
            {invoiceTab !== "calendario" && (
              <button
                onClick={() => invoiceTab === "recibida" ? setShowForm(!showForm) : setShowFormEmitida(!showFormEmitida)}
                className="flex items-center gap-2 bg-gray-900 text-white text-[13px] font-semibold px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors">
                <Plus size={15} /> {invoiceTab === "recibida" ? "Agregar recibida" : "Agregar emitida"}
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray-700 mb-4">Nueva factura de compra</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Proveedor *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Nombre del proveedor"
                  autoComplete="off"
                />
                {showSuggestions && (
                  <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {providerSuggestions.map((p) => (
                      <li
                        key={p}
                        onMouseDown={() => selectProvider(p)}
                        className="px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
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
              <div className="sm:col-span-2 relative">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Descripción</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                  value={form.description}
                  onChange={(e) => handleDescChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowDescSuggestions(false), 150)}
                  placeholder="Ej: Arriendo oficina, suscripción software..."
                  autoComplete="off"
                />
                {showDescSuggestions && (
                  <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {descSuggestions.map((d) => (
                      <li
                        key={d}
                        onMouseDown={() => selectDesc(d)}
                        className="px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
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

        {invoiceTab === "recibida" && (
          <>
            {facturasCompra.length === 0 && !showForm ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-10 text-center">
                <AlertCircle size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-[13px] text-gray-400">No hay facturas recibidas registradas para este mes.</p>
                <p className="text-[12px] text-gray-300 mt-1">Agrégalas para calcular tu crédito fiscal IVA.</p>
              </div>
            ) : facturasCompra.length > 0 ? (
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
                      <th className="text-center px-4 py-3 font-semibold">Doc.</th>
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
                          <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">{fmtCLP(inv.amount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums">
                            {inv.exenta ? "—" : fmtCLP(ivaRow)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.exenta ? "bg-gray-100 text-gray-400" : "bg-green-100 text-green-700"}`}>
                              {inv.exenta ? "Exenta" : "Afecta"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {uploading === inv.id ? (
                                <Loader2 size={14} className="animate-spin text-gray-400" />
                              ) : (
                                <>
                                  {inv.driveUrl && (
                                    <a href={inv.driveUrl} target="_blank" rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-700 transition-colors" title="Ver documento">
                                      <Eye size={14} />
                                    </a>
                                  )}
                                  <label className="cursor-pointer text-gray-300 hover:text-indigo-500 transition-colors" title="Adjuntar documento">
                                    <Paperclip size={14} />
                                    <input type="file" className="hidden" accept=".pdf,.xml,.png,.jpg,.jpeg"
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttach(inv.id, f); }} />
                                  </label>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id}
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700 tabular-nums">
                        {fmtCLP(facturasCompra.reduce((a, i) => a + i.amount, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 tabular-nums">{fmtCLP(ivaCredito)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
          </>
        )}

        {invoiceTab === "emitida" && (
          <>
            {showFormEmitida && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
                <h3 className="text-[13px] font-bold text-gray-700 mb-4">Nueva factura emitida</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Cliente *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                      value={formEmitida.provider} onChange={(e) => setFormEmitida({ ...formEmitida, provider: e.target.value })}
                      placeholder="Nombre del cliente" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">N° Factura</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                      value={formEmitida.number} onChange={(e) => setFormEmitida({ ...formEmitida, number: e.target.value })}
                      placeholder="Ej: 123" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Fecha *</label>
                    <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                      value={formEmitida.date} onChange={(e) => setFormEmitida({ ...formEmitida, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Monto total (con IVA) *</label>
                    <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                      value={formEmitida.amount} onChange={(e) => setFormEmitida({ ...formEmitida, amount: e.target.value })}
                      placeholder="0" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Descripción</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-300"
                      value={formEmitida.description} onChange={(e) => setFormEmitida({ ...formEmitida, description: e.target.value })}
                      placeholder="Ej: Comisión servicios de viaje..." />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddEmitida}
                    disabled={savingEmitida || !formEmitida.provider || !formEmitida.amount || !formEmitida.date}
                    className="bg-gray-900 text-white text-[13px] font-semibold px-5 py-2 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40">
                    {savingEmitida ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => { setShowFormEmitida(false); setFormEmitida({ provider: "", number: "", date: "", amount: "", description: "" }); }}
                    className="text-[13px] text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {facturasEmitidas.length === 0 && !showFormEmitida ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-10 text-center">
                <AlertCircle size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-[13px] text-gray-400">No hay facturas emitidas para este mes.</p>
              </div>
            ) : facturasEmitidas.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-semibold">Cliente</th>
                      <th className="text-left px-4 py-3 font-semibold">N°</th>
                      <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                      <th className="text-right px-4 py-3 font-semibold">Monto total</th>
                      <th className="text-right px-4 py-3 font-semibold">IVA débito</th>
                      <th className="text-center px-4 py-3 font-semibold">Doc.</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {facturasEmitidas.map((inv, i) => {
                      const ivaRow = inv.amount * IVA_RATE / (1 + IVA_RATE);
                      return (
                        <tr key={inv.id} className={`border-t border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{inv.provider}</td>
                          <td className="px-4 py-3 text-gray-500">{inv.number || "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{inv.date || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">{fmtCLP(inv.amount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-500 tabular-nums">{fmtCLP(ivaRow)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {uploading === inv.id ? (
                                <Loader2 size={14} className="animate-spin text-gray-400" />
                              ) : (
                                <>
                                  {inv.driveUrl && (
                                    <a href={inv.driveUrl} target="_blank" rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-700 transition-colors" title="Ver documento">
                                      <Eye size={14} />
                                    </a>
                                  )}
                                  <label className="cursor-pointer text-gray-300 hover:text-indigo-500 transition-colors" title="Adjuntar documento">
                                    <Paperclip size={14} />
                                    <input type="file" className="hidden" accept=".pdf,.xml,.png,.jpg,.jpeg"
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttach(inv.id, f); }} />
                                  </label>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id}
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700 tabular-nums">
                        {fmtCLP(facturasEmitidas.reduce((a, i) => a + i.amount, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-500 tabular-nums">
                        {fmtCLP(facturasEmitidas.reduce((a, i) => a + i.amount * IVA_RATE / (1 + IVA_RATE), 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
          </>
        )}

        {invoiceTab === "calendario" && (
          <div className="space-y-6">

            {/* HotelDO */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                  <span className="text-orange-500 font-black text-[11px]">HD</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">HotelDO</h3>
                  <p className="text-[12px] text-gray-400">Ciclo quincenal · pago vía Despegar</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Estado de cuenta", color: "bg-blue-100 border-blue-200 text-blue-700", desc: "Lun–Mié: verificar comisiones en portal" },
                  { label: "Carga de factura", color: "bg-amber-100 border-amber-200 text-amber-700", desc: "Subir factura emitida al portal HotelDO" },
                  { label: "Pago", color: "bg-pink-100 border-pink-200 text-pink-700", desc: "Jueves: Despegar transfiere las comisiones" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.color}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-[12px]">{item.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Próximos pagos 2026</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { mes: "Jun", fechas: ["4 jun — subir factura", "11 jun — cobro $402.000", "18 jun — subir factura", "25 jun — cobro ~$643.000"] },
                  { mes: "Jul", fechas: ["9 jul — pago", "30 jul — pago"] },
                  { mes: "Ago", fechas: ["13 ago — pago", "27 ago — pago"] },
                  { mes: "Sep", fechas: ["24 sep — pago"] },
                ].map(({ mes, fechas }) => (
                  <div key={mes} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-2">{mes}</p>
                    {fechas.map((f) => (
                      <p key={f} className="text-[12px] text-gray-700 mb-1">{f}</p>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-[12px] text-amber-700">
                  <span className="font-bold">Pendiente cobrar:</span> INV2418113 ($402.000, período 4–17 may) + nueva factura mayo 18–31 (~$643.000). Subir INV2418113 el <span className="font-bold">4 de junio</span>.
                </p>
              </div>
            </div>

            {/* Viaclub */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                  <span className="text-teal-500 font-black text-[11px]">VC</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Viaclub</h3>
                  <p className="text-[12px] text-gray-400">Ciclo semanal · factura miércoles, pago jueves</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wide mb-1">Facturación</p>
                  <p className="text-[13px] text-teal-800 font-semibold">Todos los miércoles</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide mb-1">Pago</p>
                  <p className="text-[13px] text-green-800 font-semibold">Todos los jueves</p>
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
                <p className="text-[12px] text-teal-700">
                  <span className="font-bold">Pendiente:</span> Hotel Holiday Inn Asunción — $162.000 · facturar <span className="font-bold">miércoles 28 mayo</span>, cobro <span className="font-bold">jueves 29 mayo</span>.
                </p>
              </div>
            </div>

            {/* Ratehawk */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                  <span className="text-orange-600 font-black text-[11px]">RH</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Ratehawk</h3>
                  <p className="text-[12px] text-gray-400">Paga y cobra en dólares · ciclo a confirmar</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-[12px] text-gray-500">Las comisiones de Ratehawk aparecen como transferencias en USD (~$440–443 USD) en el banco. Ciclo de facturación pendiente de confirmar.</p>
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
}
