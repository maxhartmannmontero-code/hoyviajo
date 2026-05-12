"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, Plus, Phone, Mail, Building2, X } from "lucide-react";
import Link from "next/link";
import { Contact, Activity, Voucher, ActivityType, ActivityStatus } from "@/types";
import {
  CONTACT_STATUS_COLORS, CONTACT_STATUS_LABELS,
  ACTIVITY_TYPE_LABELS, formatDate, formatDateTime, formatCurrency,
} from "@/lib/utils";

const ACTIVITY_TYPES: ActivityType[] = ["llamada", "email", "reunion", "nota", "tarea"];

function ActivityModal({
  contactId,
  contactName,
  onClose,
  onSave,
}: {
  contactId: string;
  contactName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    type: "llamada" as ActivityType,
    notes: "",
    date: new Date().toISOString().split("T")[0],
    status: "pendiente" as ActivityStatus,
    nextFollowUp: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, contactId, contactName }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Nueva Actividad</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ActivityType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Estado</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ActivityStatus })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pendiente">Pendiente</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Próximo Follow-up</label>
              <input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);

  async function fetchData() {
    const [contacts, acts, vouch] = await Promise.all([
      fetch("/api/contacts").then((r) => r.json()),
      fetch(`/api/activities?contactId=${id}`).then((r) => r.json()),
      fetch(`/api/vouchers?contactId=${id}`).then((r) => r.json()),
    ]);
    const found = (contacts as Contact[]).find((c) => c.id === id);
    setContact(found ?? null);
    setActivities(Array.isArray(acts) ? acts : []);
    setVouchers(Array.isArray(vouch) ? vouch : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!contact) return <div className="p-8 text-gray-500">Contacto no encontrado</div>;

  return (
    <div className="p-8">
      <Link href="/contacts" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Volver a Contactos
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
                {contact.role && <p className="text-sm text-gray-500">{contact.role}</p>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${CONTACT_STATUS_COLORS[contact.status]}`}>
                  {CONTACT_STATUS_LABELS[contact.status]}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {contact.company && (
                <div className="flex items-center gap-2 text-gray-600"><Building2 size={14} className="text-gray-400" />{contact.company}</div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-gray-600"><Mail size={14} className="text-gray-400" />{contact.email}</div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" />{contact.phone}</div>
              )}
            </div>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {contact.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                ))}
              </div>
            )}
            {contact.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{contact.notes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">Creado: {formatDate(contact.createdAt)}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Vouchers ({vouchers.length})</h3>
            {vouchers.length === 0 ? (
              <p className="text-xs text-gray-400">Sin vouchers adjuntos</p>
            ) : (
              <div className="space-y-2">
                {vouchers.map((v) => (
                  <a key={v.id} href={v.driveUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-xs">
                    <span className="truncate text-gray-700">{v.fileName}</span>
                    <span className="text-gray-500 ml-2 whitespace-nowrap">{formatCurrency(v.amount, v.currency)}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">Actividades & Follow-ups</h2>
              <button onClick={() => setShowActivityModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {activities.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-400">No hay actividades registradas</p>
              ) : (
                activities
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((a) => (
                    <div key={a.id} className="p-4 flex gap-4">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        a.status === "completado" ? "bg-green-400" :
                        a.status === "cancelado" ? "bg-red-400" : "bg-orange-400"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {ACTIVITY_TYPE_LABELS[a.type]}
                          </span>
                          <span className="text-xs text-gray-400">{formatDateTime(a.createdAt)}</span>
                        </div>
                        {a.notes && <p className="text-sm text-gray-600 mt-1">{a.notes}</p>}
                        {a.nextFollowUp && (
                          <p className="text-xs text-orange-600 mt-1">
                            Follow-up: {formatDate(a.nextFollowUp)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showActivityModal && (
        <ActivityModal
          contactId={contact.id}
          contactName={contact.name}
          onClose={() => setShowActivityModal(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
