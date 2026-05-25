"use client";

import { useEffect, useState, useRef } from "react";
import {
  Upload, X, Search, CheckCircle2, Clock, EyeOff,
  Link2, Unlink, Trash2, TrendingUp, TrendingDown, AlertCircle, Plus,
} from "lucide-react";
import type { BankTransaction, BankTxStatus, Sale, Expense } from "@/types";

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

function fmtDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "2-digit" });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const STATUS_CONFIG: Record<BankTxStatus, { label: string; color: string; Icon: React.ElementType }> = {
  pendiente:  { label: "Pendiente",  color: "bg-yellow-100 text-yellow-700", Icon: Clock       },
  conciliado: { label: "Conciliado", color: "bg-green-100 text-green-700",   Icon: CheckCircle2 },
  ignorado:   { label: "Ignorado",   color: "bg-gray-100 text-gray-500",     Icon: EyeOff       },
};

// ─── Manual Entry Modal ────────────────────────────────────────────────────

function ManualEntryModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"cargo" | "abono">("cargo");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const n = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (!date || !description.trim() || isNaN(n) || n <= 0) {
      setError("Completa todos los campos con valores válidos.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/bank-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manual: {
          date,
          description: description.trim(),
          debit: type === "cargo" ? n : 0,
          credit: type === "abono" ? n : 0,
        },
      }),
    });
    setSaving(false);
    if (res.ok) {
      onDone();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Error al guardar");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Agregar movimiento manual</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pago:ratehawk.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setType("cargo")}
                className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  type === "cargo"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                Cargo (egreso)
              </button>
              <button
                onClick={() => setType("abono")}
                className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  type === "abono"
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                Abono (ingreso)
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Monto (CLP)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="18503"
              min="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={14} /> {saving ? "Guardando..." : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Modal ──────────────────────────────────────────────────────────

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<{ date: string; description: string; debit: number; credit: number }[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsv(text);
      loadPreview(text);
    };
    reader.readAsText(file, "latin1");
  }

  function loadPreview(text: string) {
    import("@/lib/parse-banco-chile").then(({ parseBancoChileCSV }) => {
      const parsed = parseBancoChileCSV(text);
      if (parsed.length === 0) {
        setParseError("No se pudo leer el CSV. Asegúrate de exportar desde Mi Banco → Cartola → Exportar.");
        setPreview([]);
      } else {
        setParseError("");
        setPreview(parsed.slice(0, 5));
      }
    });
  }

  async function handleImport() {
    if (!csv || parseError) return;
    setImporting(true);
    const res = await fetch("/api/bank-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setResult(data);
    } else {
      setParseError(data.error || "Error al importar");
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 text-xl mb-2">¡Importado!</h3>
          <p className="text-gray-500 text-sm mb-1">
            <span className="font-semibold text-gray-800">{result.imported}</span> transacciones nuevas importadas
          </p>
          {result.skipped > 0 && (
            <p className="text-gray-400 text-xs mb-4">{result.skipped} ya existían y se omitieron</p>
          )}
          <button onClick={() => { onDone(); onClose(); }}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            Ver transacciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Importar cartola CSV</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-semibold mb-1">¿Cómo exportar desde Banco de Chile?</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Ingresa a Mi Banco → Cuentas → Cartola</li>
              <li>Selecciona el período que quieres conciliar</li>
              <li>Haz clic en "Exportar" → Selecciona formato CSV o Excel (CSV)</li>
            </ol>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              csv ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-blue-400"
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,.xls,.xlsx"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <Upload size={28} className={`mx-auto mb-2 ${csv ? "text-green-500" : "text-gray-300"}`} />
            {csv
              ? <p className="text-sm text-green-700 font-medium">Archivo cargado</p>
              : <p className="text-sm text-gray-500">Arrastra el CSV o haz clic para seleccionar</p>}
          </div>

          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Vista previa (primeras {preview.length} filas de las transacciones parseadas)
              </p>
              <div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 text-left text-gray-400 font-medium">Fecha</th>
                      <th className="py-2 px-3 text-left text-gray-400 font-medium">Descripción</th>
                      <th className="py-2 px-3 text-right text-gray-400 font-medium">Cargo</th>
                      <th className="py-2 px-3 text-right text-gray-400 font-medium">Abono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((tx, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="py-2 px-3 text-gray-500">{fmtDate(tx.date)}</td>
                        <td className="py-2 px-3 text-gray-700 max-w-[180px] truncate">{tx.description}</td>
                        <td className="py-2 px-3 text-right text-red-600">{tx.debit > 0 ? fmtCLP(tx.debit) : "—"}</td>
                        <td className="py-2 px-3 text-right text-green-600">{tx.credit > 0 ? fmtCLP(tx.credit) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={handleImport} disabled={importing || !csv || !!parseError || preview.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
            <Upload size={14} /> {importing ? "Importando..." : "Importar transacciones"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Match Modal ───────────────────────────────────────────────────────────

function MatchModal({
  tx,
  sales,
  expenses,
  onClose,
  onSave,
}: {
  tx: BankTransaction;
  sales: Sale[];
  expenses: Expense[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [tab, setTab] = useState<"sale" | "expense">(tx.credit > 0 ? "sale" : "expense");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const amount = tx.credit > 0 ? tx.credit : tx.debit;

  const filteredSales = sales.filter((s) => {
    if (!search) return true;
    return (
      s.clientName.toLowerCase().includes(search.toLowerCase()) ||
      s.product.toLowerCase().includes(search.toLowerCase()) ||
      s.detail.toLowerCase().includes(search.toLowerCase())
    );
  }).sort((a, b) => Math.abs(a.commission - amount) - Math.abs(b.commission - amount));

  const filteredExpenses = expenses.filter((e) => {
    if (!search) return true;
    return (
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    );
  }).sort((a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount));

  async function link(matchedId: string, matchedType: "sale" | "expense", matchedLabel: string) {
    setSaving(true);
    await fetch(`/api/bank-transactions/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "conciliado", matchedId, matchedType, matchedLabel }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <div>
            <h2 className="font-semibold text-gray-900">Vincular transacción</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{tx.description}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className={`flex items-center justify-between p-3 rounded-xl ${
            tx.credit > 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
          }`}>
            <div>
              <p className="text-xs text-gray-500">{fmtDate(tx.date)}</p>
              <p className="text-sm font-medium text-gray-800">{tx.description}</p>
            </div>
            <span className={`text-lg font-bold ${tx.credit > 0 ? "text-green-700" : "text-red-700"}`}>
              {tx.credit > 0 ? "+" : "-"}{fmtCLP(tx.credit || tx.debit)}
            </span>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setTab("sale")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === "sale" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Vincular a venta ({sales.length})
            </button>
            <button onClick={() => setTab("expense")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === "expense" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Vincular a gasto ({expenses.length})
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 rounded-xl border border-gray-100">
            {tab === "sale" ? (
              filteredSales.length === 0
                ? <p className="text-center py-6 text-xs text-gray-400">No hay ventas que coincidan</p>
                : filteredSales.map((s) => (
                    <button key={s.id} disabled={saving} onClick={() => link(s.id, "sale", `${s.clientName} — ${s.product}`)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 text-left transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.clientName}</p>
                        <p className="text-xs text-gray-400">{s.product} · {s.saleDate || s.createdAt.slice(0, 10)}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-700">{fmtCLP(s.commission)}</span>
                    </button>
                  ))
            ) : (
              filteredExpenses.length === 0
                ? <p className="text-center py-6 text-xs text-gray-400">No hay gastos que coincidan</p>
                : filteredExpenses.map((e) => (
                    <button key={e.id} disabled={saving} onClick={() => link(e.id, "expense", `${e.category} — ${e.description}`)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 text-left transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{e.description}</p>
                        <p className="text-xs text-gray-400">{e.category} · {e.month}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{fmtCLP(e.amount)}</span>
                    </button>
                  ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ConciliacionPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState<BankTxStatus | "todos">("todos");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [matchTx, setMatchTx] = useState<BankTransaction | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function fetchData() {
    const res = await fetch("/api/bank-transactions");
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setSales(data.sales ?? []);
      setExpenses(data.expenses ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function seedMay() {
    if (!confirm("¿Cargar los 33 movimientos de mayo 2026?")) return;
    setSeeding(true);
    await fetch("/api/bank-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: [
        { date: "2026-05-04", description: "Pago:e-Agencias",                            debit: 18503,   credit: 0 },
        { date: "2026-05-04", description: "Pago:ratehawk.com",                           debit: 93268,   credit: 0 },
        { date: "2026-05-04", description: "Traspaso De:maximiliano",                     debit: 0,       credit: 100000 },
        { date: "2026-05-04", description: "App-Traspaso A:carolina Matthews",            debit: 20000,   credit: 0 },
        { date: "2026-05-04", description: "App-Traspaso A:max Hartmann",                 debit: 25000,   credit: 0 },
        { date: "2026-05-04", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
        { date: "2026-05-04", description: "App-Traspaso A:carolina Matthews",            debit: 52000,   credit: 0 },
        { date: "2026-05-04", description: "Pago:shellbalmaceda288",                      debit: 15000,   credit: 0 },
        { date: "2026-05-04", description: "Pago:mc Donalds",                             debit: 8590,    credit: 0 },
        { date: "2026-05-04", description: "Pago:sodimac La Serena",                      debit: 9081,    credit: 0 },
        { date: "2026-05-05", description: "App-Traspaso A:max Hartmann",                 debit: 20000,   credit: 0 },
        { date: "2026-05-05", description: "App-Traspaso A:pablo Alexis Arellano Pineda", debit: 150000,  credit: 0 },
        { date: "2026-05-05", description: "App-Traspaso A:carolina Matthews",            debit: 69000,   credit: 0 },
        { date: "2026-05-05", description: "Traspaso De:maximiliano",                     debit: 0,       credit: 120000 },
        { date: "2026-05-15", description: "Comision Compras En El Extranjero",           debit: 440,     credit: 0 },
        { date: "2026-05-15", description: "Comision Compras En El Extranjero",           debit: 443,     credit: 0 },
        { date: "2026-05-15", description: "App-Traspaso A:zeus Chile",                   debit: 59500,   credit: 0 },
        { date: "2026-05-15", description: "App-Traspaso A:carolina Matthews",            debit: 225000,  credit: 0 },
        { date: "2026-05-15", description: "Pago:proveedores 0969078309",                 debit: 0,       credit: 1103000 },
        { date: "2026-05-18", description: "App-Traspaso A:carolina Matthews",            debit: 57000,   credit: 0 },
        { date: "2026-05-18", description: "App-Traspaso A:max Hartmann",                 debit: 10000,   credit: 0 },
        { date: "2026-05-18", description: "App-Traspaso A:carolina Matthews",            debit: 50000,   credit: 0 },
        { date: "2026-05-19", description: "App-Traspaso A:carolina Matthews",            debit: 30000,   credit: 0 },
        { date: "2026-05-20", description: "App-Traspaso A:carolina Matthews",            debit: 20000,   credit: 0 },
        { date: "2026-05-22", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
        { date: "2026-05-22", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
        { date: "2026-05-22", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
        { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
        { date: "2026-05-25", description: "App-Traspaso A:max Hartmann",                 debit: 20000,   credit: 0 },
        { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 30000,   credit: 0 },
        { date: "2026-05-25", description: "Pago:claude.ai Subscri",                      debit: 22015,   credit: 0 },
        { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 15000,   credit: 0 },
        { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 50000,   credit: 0 },
      ]}),
    });
    setSeeding(false);
    fetchData();
  }

  async function ignore(tx: BankTransaction) {
    setActionLoading(tx.id);
    await fetch(`/api/bank-transactions/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ignorado" }),
    });
    setActionLoading(null);
    fetchData();
  }

  async function unlink(tx: BankTransaction) {
    setActionLoading(tx.id);
    await fetch(`/api/bank-transactions/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendiente", matchedId: "", matchedType: "", matchedLabel: "" }),
    });
    setActionLoading(null);
    fetchData();
  }

  async function remove(tx: BankTransaction) {
    if (!confirm(`¿Eliminar esta transacción?\n${tx.description}`)) return;
    setActionLoading(tx.id);
    await fetch(`/api/bank-transactions/${tx.id}`, { method: "DELETE" });
    setActionLoading(null);
    fetchData();
  }

  // Months that have transactions, plus current month
  const allMonths = Array.from(
    new Set([currentMonth(), ...transactions.map((t) => t.date.slice(0, 7))])
  ).sort((a, b) => b.localeCompare(a));

  const byMonth = transactions.filter((t) => t.date.slice(0, 7) === month);

  const filtered = byMonth.filter((t) => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) &&
        !t.docNumber.includes(search)) return false;
    return true;
  });

  const totalCredit = byMonth.reduce((s, t) => s + t.credit, 0);
  const totalDebit = byMonth.reduce((s, t) => s + t.debit, 0);
  const pending = byMonth.filter((t) => t.status === "pendiente").length;
  const conciliado = byMonth.filter((t) => t.status === "conciliado").length;

  // CRM data for the month
  const monthSalesTotal = sales
    .filter((s) => (s.saleDate || s.createdAt).slice(0, 7) === month)
    .reduce((s, v) => s + v.commission, 0);
  const monthExpensesTotal = expenses
    .filter((e) => e.month === month)
    .reduce((s, e) => s + e.amount, 0);

  const fmtMonthLabel = (m: string) =>
    new Date(m + "-15").toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h1>
          <p className="text-sm text-gray-500 mt-1">Cruza tu cartola de Banco de Chile con las ventas y gastos del CRM</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={seedMay} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-100 disabled:opacity-50">
            {seeding ? "Cargando..." : "Cargar Mayo 2026"}
          </button>
          <button onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-gray-300 hover:bg-gray-50">
            <Plus size={16} /> Agregar manual
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
            <Upload size={16} /> Importar CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-green-600" />
            <p className="text-xs text-green-600 font-medium">Ingresos del mes</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{fmtCLP(totalCredit)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-600" />
            <p className="text-xs text-red-600 font-medium">Egresos del mes</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{fmtCLP(totalDebit)}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-yellow-600" />
            <p className="text-xs text-yellow-600 font-medium">Pendientes</p>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{pending}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <p className="text-xs text-emerald-600 font-medium">Conciliados</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{conciliado}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {allMonths.map((m) => <option key={m} value={m}>{fmtMonthLabel(m)}</option>)}
        </select>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["todos", "pendiente", "conciliado", "ignorado"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {s === "todos" ? `Todos (${byMonth.length})` : s === "pendiente" ? `Pendiente (${pending})` : s === "conciliado" ? `Conciliado (${conciliado})` : `Ignorado (${byMonth.filter(t=>t.status==="ignorado").length})`}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar descripción..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Cuadre del mes */}
      {byMonth.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cuadre del mes</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Ingresos banco vs comisiones CRM</p>
              <div className="flex items-end gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Banco</p>
                  <p className="text-base font-bold text-green-700">{fmtCLP(totalCredit)}</p>
                </div>
                <span className="text-gray-300 pb-0.5">vs</span>
                <div className="text-center">
                  <p className="text-xs text-gray-400">CRM</p>
                  <p className="text-base font-bold text-blue-700">{fmtCLP(monthSalesTotal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Dif.</p>
                  <p className={`text-base font-bold ${Math.abs(totalCredit - monthSalesTotal) < 1000 ? "text-green-600" : "text-orange-600"}`}>
                    {fmtCLP(totalCredit - monthSalesTotal)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Egresos banco vs gastos CRM</p>
              <div className="flex items-end gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Banco</p>
                  <p className="text-base font-bold text-red-700">{fmtCLP(totalDebit)}</p>
                </div>
                <span className="text-gray-300 pb-0.5">vs</span>
                <div className="text-center">
                  <p className="text-xs text-gray-400">CRM</p>
                  <p className="text-base font-bold text-blue-700">{fmtCLP(monthExpensesTotal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Dif.</p>
                  <p className={`text-base font-bold ${Math.abs(totalDebit - monthExpensesTotal) < 1000 ? "text-green-600" : "text-orange-600"}`}>
                    {fmtCLP(totalDebit - monthExpensesTotal)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 && byMonth.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Upload size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium text-gray-500 mb-1">No hay transacciones importadas</p>
          <p className="text-sm mb-4">Agrega movimientos manualmente o importa tu cartola CSV</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setShowManual(true)}
              className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
              Agregar manual
            </button>
            <button onClick={() => setShowImport(true)}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              Importar CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Fecha</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Descripción</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-400">Cargo</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-400">Abono</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Estado</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Vinculado a</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                    No hay transacciones con este filtro
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((tx) => {
                    const { label, color, Icon } = STATUS_CONFIG[tx.status];
                    const busy = actionLoading === tx.id;
                    return (
                      <tr key={tx.id} className={`hover:bg-gray-50/50 transition-colors ${busy ? "opacity-50" : ""}`}>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(tx.date)}</td>
                        <td className="py-3 px-4 text-gray-800 max-w-[220px]">
                          <p className="truncate font-medium">{tx.description}</p>
                          {tx.docNumber && <p className="text-xs text-gray-400">Doc: {tx.docNumber}</p>}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600">
                          {tx.debit > 0 ? fmtCLP(tx.debit) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          {tx.credit > 0 ? fmtCLP(tx.credit) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                            <Icon size={11} /> {label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 max-w-[160px]">
                          <span className="truncate block">{tx.matchedLabel || "—"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {tx.status === "pendiente" && (
                              <>
                                <button onClick={() => setMatchTx(tx)} disabled={busy}
                                  title="Vincular a venta o gasto"
                                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Link2 size={14} />
                                </button>
                                <button onClick={() => ignore(tx)} disabled={busy}
                                  title="Ignorar"
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                  <EyeOff size={14} />
                                </button>
                              </>
                            )}
                            {tx.status === "conciliado" && (
                              <button onClick={() => unlink(tx)} disabled={busy}
                                title="Desvincular"
                                className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                                <Unlink size={14} />
                              </button>
                            )}
                            {tx.status === "ignorado" && (
                              <button onClick={() => unlink(tx)} disabled={busy}
                                title="Marcar como pendiente"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Clock size={14} />
                              </button>
                            )}
                            <button onClick={() => remove(tx)} disabled={busy}
                              title="Eliminar"
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showManual && <ManualEntryModal onClose={() => setShowManual(false)} onDone={fetchData} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={fetchData} />}
      {matchTx && (
        <MatchModal
          tx={matchTx}
          sales={sales}
          expenses={expenses}
          onClose={() => setMatchTx(null)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
