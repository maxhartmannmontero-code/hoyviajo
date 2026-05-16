"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, X, Trash2, ExternalLink, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Invoice, InvoiceDirection } from "@/types";

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function formatMonth(m: string) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

function formatCurrency(n: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

interface UploadModalProps {
  direction: InvoiceDirection;
  onClose: () => void;
  onSave: () => void;
}

function UploadModal({ direction, onClose, onSave }: UploadModalProps) {
  const [form, setForm] = useState({
    month: currentMonth(),
    number: "",
    provider: "",
    amount: "",
    currency: "CLP",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    notes: "",
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">
            Subir factura {direction === "emitida" ? "emitida" : "recibida"}
          </h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Archivo *</label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <p className="text-sm text-gray-700 font-medium">{file.name}</p>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Haz clic para seleccionar PDF o imagen</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Mes *</label>
              <input type="month" required value={form.month} onChange={(e) => set("month", e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Fecha factura</label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">N° factura</label>
              <input value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="001234" className={INPUT} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                {direction === "emitida" ? "Cliente" : "Proveedor"}
              </label>
              <input value={form.provider} onChange={(e) => set("provider", e.target.value)}
                placeholder={direction === "emitida" ? "Nombre cliente" : "Nombre proveedor"} className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700 block mb-1">Monto</label>
              <input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Moneda</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={INPUT}>
                <option>CLP</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Descripción</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Concepto de la factura" className={INPUT} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              rows={2} className={`${INPUT} resize-none`} placeholder="Observaciones adicionales..." />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button type="submit" disabled={saving || !file}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Subiendo..." : "Subir factura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MonthFolder({ month, invoices, onDelete }: { month: string; invoices: Invoice[]; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const currency = invoices[0]?.currency || "CLP";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          <span className="font-medium text-gray-800 text-sm">{formatMonth(month)}</span>
          <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">{invoices.length}</span>
        </div>
        <span className="text-sm font-semibold text-gray-700">{formatCurrency(total, currency)}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
              <FileText size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.description || inv.fileName}</p>
                  {inv.number && <span className="text-xs text-gray-400">#{inv.number}</span>}
                </div>
                {inv.provider && <p className="text-xs text-gray-500 truncate">{inv.provider}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {inv.amount > 0 && (
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.amount, inv.currency)}</p>
                )}
                {inv.date && <p className="text-xs text-gray-400">{inv.date}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={inv.driveUrl} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => onDelete(inv.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InvoiceDirection>("recibida");
  const [showModal, setShowModal] = useState(false);

  async function fetchData() {
    const res = await fetch("/api/facturas");
    const data = await res.json();
    setInvoices(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta factura?")) return;
    await fetch(`/api/facturas/${id}`, { method: "DELETE" });
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = invoices.filter((i) => i.direction === tab);

  const byMonth = filtered.reduce<Record<string, Invoice[]>>((acc, inv) => {
    const key = inv.month || "sin-mes";
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {});

  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const totalTab = filtered.reduce((s, i) => s + i.amount, 0);
  const currency = filtered[0]?.currency || "CLP";

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} facturas · Total: {formatCurrency(totalTab, currency)}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
        >
          <Upload size={16} /> Subir factura
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(["recibida", "emitida"] as InvoiceDirection[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "recibida" ? "Recibidas" : "Emitidas"}
          </button>
        ))}
      </div>

      {months.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay facturas {tab === "recibida" ? "recibidas" : "emitidas"} aún</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">
            Subir la primera
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => (
            <MonthFolder
              key={month}
              month={month}
              invoices={byMonth[month]}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <UploadModal
          direction={tab}
          onClose={() => setShowModal(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
