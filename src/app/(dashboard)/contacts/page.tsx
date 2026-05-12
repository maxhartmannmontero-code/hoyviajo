"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Phone, Mail, Building2, X } from "lucide-react";
import { Contact, ContactStatus } from "@/types";
import { CONTACT_STATUS_COLORS, CONTACT_STATUS_LABELS, formatDate } from "@/lib/utils";
import Link from "next/link";

const STATUS_OPTIONS: ContactStatus[] = ["lead", "prospecto", "cliente", "inactivo"];
const SOURCE_OPTIONS = ["Referido", "LinkedIn", "Web", "Email", "Llamada", "Evento", "Otro"];

function ContactModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<Contact, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", role: "",
    tags: "", status: "lead" as ContactStatus, source: "", notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-semibold text-gray-900">Nuevo Contacto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Nombre *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Empresa</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Cargo</label>
              <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Estado</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContactStatus })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Fuente</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]">
                <option value="">Seleccionar</option>
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Tags (separados por coma)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="tag1, tag2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3c93d6] resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-lg hover:bg-[#2d7dbf] disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);

  async function fetchContacts() {
    try {
      const res = await fetch("/api/contacts");
      const data = res.ok ? await res.json() : [];
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchContacts(); }, []);

  async function handleSave(data: Omit<Contact, "id" | "createdAt" | "updatedAt">) {
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchContacts();
  }

  const filtered = contacts.filter((c) => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} contactos en total</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3c93d6] text-white text-sm font-medium rounded-xl hover:bg-[#2d7dbf] transition-colors">
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contactos..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3c93d6]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3c93d6]">
          <option value="all">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#3c93d6] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No se encontraron contactos</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-[#ddeef9] text-[#3c93d6] flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-[#3c93d6]">{c.name}</p>
                          {c.role && <p className="text-xs text-gray-400">{c.role}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.company && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Building2 size={13} className="text-gray-400" />
                          {c.company}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <Mail size={12} /> {c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <Phone size={12} /> {c.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTACT_STATUS_COLORS[c.status]}`}>
                        {CONTACT_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <ContactModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}
