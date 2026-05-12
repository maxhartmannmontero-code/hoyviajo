"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, FileText, ExternalLink, X, Search, CalendarPlus, CalendarCheck, Loader2, Trash2 } from "lucide-react";
import { Voucher, Contact } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function UploadModal({
  contacts,
  onClose,
  onSave,
}: {
  contacts: Contact[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    contactId: "",
    newContactName: "",
    amount: "",
    currency: "USD",
    date: new Date().toISOString().split("T")[0],
    description: "",
    checkIn: "",
    checkOut: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isNew = form.contactId === "__new__";
  const selectedContact = contacts.find((c) => c.id === form.contactId);
  const resolvedName = isNew ? form.newContactName : (selectedContact?.name ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !resolvedName) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("contactId", isNew ? "" : form.contactId);
    fd.append("contactName", resolvedName);
    fd.append("amount", form.amount);
    fd.append("currency", form.currency);
    fd.append("date", form.date);
    fd.append("description", form.description);
    fd.append("checkIn", form.checkIn);
    fd.append("checkOut", form.checkOut);
    await fetch("/api/vouchers", { method: "POST", body: fd });
    setUploading(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Subir Voucher</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            {file ? (
              <p className="text-sm text-blue-700 font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 font-medium">Haz clic para seleccionar archivo</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — máx. 10MB</p>
              </>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Cliente *</label>
            <select required value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value, newContactName: "" })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar cliente</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Agregar nombre nuevo...</option>
            </select>
            {isNew && (
              <input
                required
                autoFocus
                placeholder="Nombre del cliente"
                value={form.newContactName}
                onChange={(e) => setForm({ ...form, newContactName: e.target.value })}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700 block mb-1">Monto</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Moneda</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="USD">USD</option>
                <option value="CLP">CLP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Fecha del voucher</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Descripción del viaje</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Vuelo Santiago → Cancún + Hotel 5N"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus size={15} className="text-blue-600" />
              <p className="text-xs font-semibold text-blue-700">Fechas del viaje (para alerta en Calendar)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-blue-600 block mb-1">Check-in / Salida</label>
                <input type="date" value={form.checkIn}
                  onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                  className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-blue-600 block mb-1">Check-out / Regreso</label>
                <input type="date" value={form.checkOut}
                  onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                  className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <p className="text-xs text-blue-500">
              Opcional — si las completas podrás crear una alerta en Google Calendar con 1 clic después de subir el voucher.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button type="submit" disabled={uploading || !file}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {uploading ? "Subiendo..." : "Subir Voucher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [addingCalendar, setAddingCalendar] = useState<string | null>(null);
  const [calendarSuccess, setCalendarSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchData() {
    const [v, c] = await Promise.all([
      fetch("/api/vouchers").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]);
    setVouchers(Array.isArray(v) ? v : []);
    setContacts(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleDelete(voucherId: string) {
    if (!confirm("¿Eliminar este voucher? Se borrará el archivo de Drive y el evento de Calendar si existe.")) return;
    setDeleting(voucherId);
    await fetch(`/api/vouchers/${voucherId}`, { method: "DELETE" });
    setDeleting(null);
    await fetchData();
  }

  async function handleAddToCalendar(voucherId: string) {
    setAddingCalendar(voucherId);
    try {
      const res = await fetch("/api/calendar/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId }),
      });
      if (res.ok) {
        setCalendarSuccess(voucherId);
        await fetchData();
        setTimeout(() => setCalendarSuccess(null), 3000);
      }
    } finally {
      setAddingCalendar(null);
    }
  }

  const filtered = vouchers.filter((v) =>
    !search ||
    v.contactName.toLowerCase().includes(search.toLowerCase()) ||
    v.fileName.toLowerCase().includes(search.toLowerCase()) ||
    v.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((s, v) => s + v.amount, 0);

  // Upcoming trips (checkIn in the future)
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = vouchers
    .filter((v) => v.checkIn && v.checkIn >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .slice(0, 5);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {vouchers.length} vouchers · Total: {formatCurrency(totalAmount)}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
          <Upload size={16} /> Subir Voucher
        </button>
      </div>

      {/* Upcoming trips banner */}
      {upcoming.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck size={16} className="text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">Próximos viajes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((v) => (
              <div key={v.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-xs shadow-sm border border-blue-100">
                <span className="font-medium text-gray-800">{v.contactName}</span>
                <span className="text-gray-400">·</span>
                <span className="text-blue-600">{v.checkIn}</span>
                {v.checkOut && <><span className="text-gray-300">→</span><span className="text-blue-600">{v.checkOut}</span></>}
                {v.calendarEventId
                  ? <CalendarCheck size={13} className="text-green-500 ml-1" aria-label="En Google Calendar" />
                  : <button onClick={() => handleAddToCalendar(v.id)} disabled={addingCalendar === v.id}
                      className="text-blue-400 hover:text-blue-700 ml-1" aria-label="Agregar al Calendar">
                      {addingCalendar === v.id ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
                    </button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-sm mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar vouchers..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p>No hay vouchers aún</p>
            </div>
          ) : (
            filtered
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((v) => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.fileName}</p>
                      <p className="text-xs text-gray-500">{v.contactName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Calendar button */}
                      {calendarSuccess === v.id ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CalendarCheck size={14} /> Creado
                        </span>
                      ) : v.calendarEventId ? (
                        <button onClick={() => handleAddToCalendar(v.id)}
                          disabled={addingCalendar === v.id}
                          aria-label="Actualizar evento en Calendar"
                          className="text-green-500 hover:text-green-700 disabled:opacity-50">
                          {addingCalendar === v.id ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
                        </button>
                      ) : (
                        <button onClick={() => handleAddToCalendar(v.id)}
                          disabled={addingCalendar === v.id}
                          title="Agregar al Google Calendar"
                          className="text-gray-300 hover:text-blue-600 transition-colors disabled:opacity-50">
                          {addingCalendar === v.id ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
                        </button>
                      )}
                      <a href={v.driveUrl} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600">
                        <ExternalLink size={16} />
                      </a>
                      <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id}
                        title="Eliminar voucher"
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">
                        {deleting === v.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold text-gray-900">{formatCurrency(v.amount, v.currency)}</span>
                    <span className="text-xs text-gray-400">{formatDate(v.date)}</span>
                  </div>

                  {(v.checkIn || v.checkOut) && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1 mb-2">
                      <CalendarCheck size={12} />
                      <span>{v.checkIn || "?"}</span>
                      {v.checkOut && <><span className="text-blue-300">→</span><span>{v.checkOut}</span></>}
                    </div>
                  )}

                  {v.description && (
                    <p className="text-xs text-gray-500 truncate">{v.description}</p>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {showModal && <UploadModal contacts={contacts} onClose={() => setShowModal(false)} onSave={fetchData} />}
    </div>
  );
}
