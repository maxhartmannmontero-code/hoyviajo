"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Deal, DealStage, Contact } from "@/types";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, formatCurrency, formatDate } from "@/lib/utils";

const STAGES: DealStage[] = ["lead", "contactado", "propuesta", "negociacion", "cerrado_ganado", "cerrado_perdido"];

function DealModal({
  contacts,
  onClose,
  onSave,
}: {
  contacts: Contact[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    contactId: "",
    dealName: "",
    amount: "",
    currency: "CLP",
    stage: "lead" as DealStage,
    probability: "50",
    closeDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedContact = contacts.find((c) => c.id === form.contactId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContact) return;
    setSaving(true);
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        contactName: selectedContact.name,
        amount: parseFloat(form.amount) || 0,
        probability: parseFloat(form.probability) || 0,
      }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Nuevo Deal</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Contacto *</label>
            <select required value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar contacto</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre del Deal *</label>
            <input required value={form.dealName} onChange={(e) => setForm({ ...form, dealName: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                <option value="PEN">PEN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Etapa</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STAGES.map((s) => <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Probabilidad (%)</label>
              <input type="number" min="0" max="100" value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Fecha de Cierre</label>
            <input type="date" value={form.closeDate} onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  async function fetchData() {
    const [d, c] = await Promise.all([
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]);
    setDeals(Array.isArray(d) ? d : []);
    setContacts(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function moveToStage(dealId: string, stage: DealStage) {
    await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage } : d));
  }

  function handleDragStart(dealId: string) {
    setDragging(dealId);
  }

  function handleDrop(stage: DealStage) {
    if (dragging) {
      moveToStage(dragging, stage);
      setDragging(null);
    }
  }

  const totalPipeline = deals
    .filter((d) => !["cerrado_ganado", "cerrado_perdido"].includes(d.stage))
    .reduce((s, d) => s + d.amount * (d.probability / 100), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {deals.filter((d) => !["cerrado_ganado", "cerrado_perdido"].includes(d.stage)).length} deals activos · Pipeline ponderado: {formatCurrency(totalPipeline)}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
          <Plus size={16} /> Nuevo Deal
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const stageTotal = stageDeals.reduce((s, d) => s + d.amount, 0);
          return (
            <div
              key={stage}
              className="flex-shrink-0 w-64 flex flex-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage)}
            >
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${DEAL_STAGE_COLORS[stage]}`}>
                    {DEAL_STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-gray-400">{stageDeals.length}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 px-1">{formatCurrency(stageTotal)}</p>
              </div>
              <div className="flex-1 space-y-2 min-h-24 bg-gray-50 rounded-xl p-2">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id)}
                    className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1">{deal.dealName}</p>
                    <p className="text-xs text-gray-500 mb-2">{deal.contactName}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(deal.amount, deal.currency)}
                      </span>
                      <span className="text-xs text-gray-400">{deal.probability}%</span>
                    </div>
                    {deal.closeDate && (
                      <p className="text-xs text-gray-400 mt-1">Cierre: {formatDate(deal.closeDate)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <DealModal contacts={contacts} onClose={() => setShowModal(false)} onSave={fetchData} />
      )}
    </div>
  );
}
