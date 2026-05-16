"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, FileText, ExternalLink, X, Search, CalendarPlus, CalendarCheck, Loader2, Trash2, Pencil, Folder, FolderOpen, ChevronRight, CalendarDays, List, ChevronLeft, Plane, Hotel, Car, Package } from "lucide-react";
import { Voucher, Contact, VoucherType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<VoucherType, { label: string; icon: React.ReactNode; badge: string; dot: string }> = {
  vuelo:       { label: "Vuelo",       icon: <Plane   size={13} />, badge: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-400" },
  alojamiento: { label: "Alojamiento", icon: <Hotel   size={13} />, badge: "bg-green-100  text-green-700  border-green-200",  dot: "bg-green-400"  },
  traslado:    { label: "Traslado",    icon: <Car     size={13} />, badge: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400" },
  otro:        { label: "Otro",        icon: <Package size={13} />, badge: "bg-blue-100   text-blue-700   border-blue-200",   dot: "bg-blue-400"   },
};

function TypeBadge({ type }: { type: VoucherType }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.otro;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.badge}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function TypeSelect({ value, onChange }: { value: VoucherType; onChange: (v: VoucherType) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(Object.entries(TYPE_CONFIG) as [VoucherType, typeof TYPE_CONFIG[VoucherType]][]).map(([key, cfg]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
            value === key ? `border-current ${cfg.badge}` : "border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          {cfg.icon}
          {cfg.label}
        </button>
      ))}
    </div>
  );
}

// ─── Detail Modal (calendar click) ───────────────────────────────────────────

function DetailModal({ voucher, onClose, onEdit }: { voucher: Voucher; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">{voucher.contactName}</p>
            <h3 className="font-semibold text-gray-900 leading-snug">{voucher.description || voucher.fileName}</h3>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2">
            <TypeBadge type={voucher.voucherType || "otro"} />
          </div>
          {(voucher.checkIn || voucher.checkOut) && (
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarCheck size={14} className="text-blue-500 flex-shrink-0" />
              <span>{voucher.checkIn}{voucher.checkOut ? ` → ${voucher.checkOut}` : ""}</span>
            </div>
          )}
          {voucher.notes && (
            <p className="text-xs text-gray-500 italic">{voucher.notes}</p>
          )}
          {voucher.amount > 0 && (
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(voucher.amount, voucher.currency)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a href={voucher.driveUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            <ExternalLink size={13} /> Ver archivo
          </a>
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Pencil size={13} /> Editar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ contacts, onClose, onSave }: { contacts: Contact[]; onClose: () => void; onSave: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    contactId: "",
    newContactName: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    notes: "",
    checkIn: "",
    checkOut: "",
    addToCalendar: false,
    voucherType: "otro" as VoucherType,
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isNew = form.contactId === "__new__";
  const selectedContact = contacts.find((c) => c.id === form.contactId);
  const resolvedName = isNew ? form.newContactName : (selectedContact?.name ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length || !resolvedName) return;
    setUploading(true);

    let contactId = isNew ? "" : form.contactId;
    if (isNew && form.newContactName.trim()) {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.newContactName.trim(), email: "", phone: "", company: "", role: "", tags: [], status: "prospecto", source: "voucher", notes: "" }),
      });
      if (res.ok) { const created = await res.json(); contactId = created.id ?? ""; }
    }

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("contactId", contactId);
      fd.append("contactName", resolvedName);
      fd.append("amount", "0");
      fd.append("currency", "");
      fd.append("date", form.date);
      fd.append("description", form.description);
      fd.append("notes", form.notes);
      fd.append("checkIn", form.checkIn);
      fd.append("checkOut", form.checkOut);
      fd.append("voucherType", form.voucherType);
      const res = await fetch("/api/vouchers", { method: "POST", body: fd });
      if (form.addToCalendar && form.checkIn && res.ok) {
        const voucher = await res.json();
        await fetch("/api/calendar/voucher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voucherId: voucher.id }) });
      }
    }

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
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${files.length ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            {files.length ? (
              <div className="space-y-1">{files.map((f, i) => <p key={i} className="text-sm text-blue-700 font-medium">{f.name}</p>)}</div>
            ) : (
              <><p className="text-sm text-gray-600 font-medium">Haz clic para seleccionar archivos</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — máx. 10MB · puedes seleccionar varios</p></>
            )}
          </div>

          {/* Tipo de voucher */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Tipo de servicio</label>
            <TypeSelect value={form.voucherType} onChange={(v) => setForm({ ...form, voucherType: v })} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Cliente *</label>
            <select required value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value, newContactName: "" })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar cliente</option>
              {[...contacts].sort((a, b) => a.name.localeCompare(b.name, "es")).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Agregar nombre nuevo...</option>
            </select>
            {isNew && (
              <input required autoFocus placeholder="Nombre del cliente" value={form.newContactName}
                onChange={(e) => setForm({ ...form, newContactName: e.target.value })}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Fecha del voucher</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Descripción del viaje</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Vuelo Santiago → Cancún"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Comentarios</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} placeholder="Ej: Incluye traslados, seguro de viaje, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus size={15} className="text-blue-600" />
              <p className="text-xs font-semibold text-blue-700">Fechas del viaje</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-blue-600 block mb-1">Check-in / Salida</label>
                <input type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                  className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-blue-600 block mb-1">Check-out / Regreso</label>
                <input type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                  className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {form.checkIn && (
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={form.addToCalendar} onChange={(e) => setForm({ ...form, addToCalendar: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-xs font-medium text-blue-700">Agregar al Google Calendar</span>
              </label>
            )}
            {!form.checkIn && <p className="text-xs text-blue-500">Completa las fechas para poder agregar al Calendar.</p>}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button type="submit" disabled={uploading || !files.length}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {uploading ? "Subiendo..." : "Subir Voucher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ voucher, onClose, onSave }: { voucher: Voucher; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    date: voucher.date ?? "",
    description: voucher.description ?? "",
    notes: voucher.notes ?? "",
    checkIn: voucher.checkIn ?? "",
    checkOut: voucher.checkOut ?? "",
    voucherType: (voucher.voucherType ?? "otro") as VoucherType,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/vouchers/${voucher.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
            <h2 className="font-semibold text-gray-900">Editar Voucher</h2>
            <p className="text-xs text-gray-400 mt-0.5">{voucher.fileName} · {voucher.contactName}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Tipo de servicio</label>
            <TypeSelect value={form.voucherType} onChange={(v) => setForm({ ...form, voucherType: v })}/>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Descripción del viaje</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Vuelo Santiago → Cancún"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Fecha del voucher</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Comentarios</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3} placeholder="Ej: Incluye traslados, seguro de viaje, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus size={15} className="text-blue-600" />
              <p className="text-xs font-semibold text-blue-700">Fechas del viaje</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-blue-600 block mb-1">Check-in / Salida</label>
                <input type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                  className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-blue-600 block mb-1">Check-out / Regreso</label>
                <input type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                  className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [addingCalendar, setAddingCalendar] = useState<string | null>(null);
  const [calendarSuccess, setCalendarSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calDate, setCalDate] = useState(() => new Date());

  function toggleFolder(name: string) {
    setOpenFolders((prev) => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  }

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
    if (!confirm("¿Eliminar este voucher?")) return;
    setDeleting(voucherId);
    await fetch(`/api/vouchers/${voucherId}`, { method: "DELETE" });
    setDeleting(null);
    await fetchData();
  }

  async function handleAddToCalendar(voucherId: string) {
    setAddingCalendar(voucherId);
    try {
      const res = await fetch("/api/calendar/voucher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voucherId }) });
      if (res.ok) { setCalendarSuccess(voucherId); await fetchData(); setTimeout(() => setCalendarSuccess(null), 3000); }
    } finally { setAddingCalendar(null); }
  }

  const filtered = vouchers.filter((v) =>
    !search ||
    v.contactName.toLowerCase().includes(search.toLowerCase()) ||
    v.fileName.toLowerCase().includes(search.toLowerCase()) ||
    v.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((s, v) => s + v.amount, 0);
  const grouped = filtered.reduce<Record<string, Voucher[]>>((acc, v) => { (acc[v.contactName] ??= []).push(v); return acc; }, {});
  const clientNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "es"));
  const isOpen = (name: string) => search ? true : openFolders.has(name);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = vouchers.filter((v) => v.checkIn && v.checkIn >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn)).slice(0, 5);

  // Calendar
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();
  const tripsByDay: Record<number, Voucher[]> = {};
  for (const v of vouchers) {
    if (!v.checkIn) continue;
    const addDay = (day: number) => {
      if (!(tripsByDay[day] ?? []).find(x => x.id === v.id)) (tripsByDay[day] ??= []).push(v);
    };
    const d = new Date(v.checkIn + "T12:00:00");
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) addDay(d.getDate());
    if (v.checkOut) {
      const out = new Date(v.checkOut + "T12:00:00");
      if (v.voucherType === "vuelo") {
        // Flights: only mark departure + return day
        if (out.getFullYear() === calYear && out.getMonth() === calMonth) addDay(out.getDate());
      } else {
        // Accommodation/transfer: mark every night
        let cur = new Date(d); cur.setDate(cur.getDate() + 1);
        while (cur <= out) {
          if (cur.getFullYear() === calYear && cur.getMonth() === calMonth) addDay(cur.getDate());
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
  }
  const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
          <p className="text-sm text-gray-500 mt-1">{vouchers.length} vouchers · Total: {formatCurrency(totalAmount)}</p>
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
                <TypeBadge type={v.voucherType || "otro"} />
                <span className="font-medium text-gray-800">{v.contactName}</span>
                <span className="text-gray-400">·</span>
                <span className="text-blue-600">{v.checkIn}</span>
                {v.checkOut && <><span className="text-gray-300">→</span><span className="text-blue-600">{v.checkOut}</span></>}
                {v.calendarEventId
                  ? <CalendarCheck size={13} className="text-green-500 ml-1" />
                  : <button onClick={() => handleAddToCalendar(v.id)} disabled={addingCalendar === v.id} className="text-blue-400 hover:text-blue-700 ml-1">
                      {addingCalendar === v.id ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
                    </button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vouchers..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <List size={15} /> Lista
          </button>
          <button onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === "calendar" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <CalendarDays size={15} /> Calendario
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
      ) : clientNames.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay vouchers aún</p>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><ChevronLeft size={18} /></button>
            <h2 className="text-base font-semibold text-gray-800">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><ChevronRight size={18} /></button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const trips = tripsByDay[day] ?? [];
              const now = new Date();
              const isToday = calYear === now.getFullYear() && calMonth === now.getMonth() && day === now.getDate();
              return (
                <div key={day} className={`min-h-[76px] rounded-xl p-1.5 border transition-colors ${isToday ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
                  <p className={`text-xs font-semibold mb-1 ${isToday ? "text-blue-600" : "text-gray-400"}`}>{day}</p>
                  <div className="space-y-0.5">
                    {trips.map((v) => {
                      const cfg = TYPE_CONFIG[v.voucherType || "otro"] ?? TYPE_CONFIG.otro;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setDetailVoucher(v)}
                          title={`${v.contactName}${v.description ? ` · ${v.description}` : ""}`}
                          className={`w-full flex items-center gap-1 text-[10px] font-medium rounded px-1 py-0.5 truncate leading-tight border cursor-pointer hover:opacity-80 transition-opacity ${cfg.badge}`}
                        >
                          <span className="flex-shrink-0">{cfg.icon}</span>
                          <span className="truncate">{v.contactName.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100 flex-wrap">
            {(Object.entries(TYPE_CONFIG) as [VoucherType, typeof TYPE_CONFIG[VoucherType]][]).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            ))}
            <span className="text-xs text-gray-400 ml-auto">Haz clic en una reserva para ver detalles</span>
          </div>

          {Object.keys(tripsByDay).length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-6">Sin viajes programados este mes</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clientNames.map((clientName) => {
            const clientVouchers = grouped[clientName].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const open = isOpen(clientName);
            return (
              <div key={clientName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => toggleFolder(clientName)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                  {open ? <FolderOpen size={20} className="text-blue-500 flex-shrink-0" /> : <Folder size={20} className="text-blue-400 flex-shrink-0" />}
                  <span className="flex-1 font-semibold text-gray-800 text-sm">{clientName}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 mr-2">
                    {clientVouchers.length} {clientVouchers.length === 1 ? "archivo" : "archivos"}
                  </span>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
                {open && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {clientVouchers.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <FileText size={16} className="text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium text-gray-800 truncate">{v.fileName}</p>
                            <TypeBadge type={v.voucherType || "otro"} />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {v.description && <span className="text-xs text-gray-500 truncate max-w-xs">{v.description}</span>}
                            {(v.checkIn || v.checkOut) && (
                              <span className="flex items-center gap-1 text-xs text-blue-500">
                                <CalendarCheck size={11} />
                                {v.checkIn}{v.checkOut ? ` → ${v.checkOut}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">{formatDate(v.date)}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {calendarSuccess === v.id ? (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CalendarCheck size={14} /> Creado</span>
                          ) : v.calendarEventId ? (
                            <button onClick={() => handleAddToCalendar(v.id)} disabled={addingCalendar === v.id} title="En Google Calendar" className="text-green-500 hover:text-green-700 disabled:opacity-50">
                              {addingCalendar === v.id ? <Loader2 size={15} className="animate-spin" /> : <CalendarCheck size={15} />}
                            </button>
                          ) : (
                            <button onClick={() => handleAddToCalendar(v.id)} disabled={addingCalendar === v.id} title="Agregar al Calendar" className="text-gray-300 hover:text-blue-500 transition-colors disabled:opacity-50">
                              {addingCalendar === v.id ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
                            </button>
                          )}
                          <a href={v.driveUrl} target="_blank" rel="noopener noreferrer" title="Ver en Drive" className="text-gray-300 hover:text-blue-500 transition-colors"><ExternalLink size={15} /></a>
                          <button onClick={() => setEditingVoucher(v)} title="Editar" className="text-gray-300 hover:text-blue-500 transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id} title="Eliminar" className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">
                            {deleting === v.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <UploadModal contacts={contacts} onClose={() => setShowModal(false)} onSave={fetchData} />}
      {editingVoucher && <EditModal voucher={editingVoucher} onClose={() => setEditingVoucher(null)} onSave={fetchData} />}
      {detailVoucher && (
        <DetailModal
          voucher={detailVoucher}
          onClose={() => setDetailVoucher(null)}
          onEdit={() => { setEditingVoucher(detailVoucher); setDetailVoucher(null); }}
        />
      )}
    </div>
  );
}
