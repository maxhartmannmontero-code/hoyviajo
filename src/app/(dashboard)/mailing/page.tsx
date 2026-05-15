"use client";

import { useEffect, useState } from "react";
import { Contact } from "@/types";
import { Search, Send, Users, CheckSquare, Square, ChevronDown, Loader2, CheckCircle, XCircle, Mail } from "lucide-react";

type SendResult = { name: string; email: string; ok: boolean; error?: string };

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  prospecto: "Prospecto",
  cliente: "Cliente",
  inactivo: "Inactivo",
};

export default function MailingPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [tab, setTab] = useState<"compose" | "preview">("compose");

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const filtered = contacts.filter((c) => {
    if (!c.email) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (!selected.size || !subject || !body) return;
    setSending(true);
    setResults(null);
    const res = await fetch("/api/mailing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: Array.from(selected), subject, body, utmCampaign }),
    });
    const data = await res.json();
    setResults(data.results ?? []);
    setSending(false);
  }

  const previewContact = contacts.find((c) => selected.has(c.id)) ?? contacts[0];
  const previewBody = previewContact
    ? body
        .replace(/\{\{nombre\}\}/gi, previewContact.name.split(" ")[0])
        .replace(/\{\{nombre_completo\}\}/gi, previewContact.name)
        .replace(/\{\{email\}\}/gi, previewContact.email)
    : body;

  const sent = results?.filter((r) => r.ok).length ?? 0;
  const failed = results?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mailing</h1>
          <p className="text-sm text-gray-500 mt-1">Envía emails desde contacto@hoyviajo.cl a tus contactos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact selector */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Destinatarios</h2>
              {selected.size > 0 && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                  {selected.size} seleccionados
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="all">Todos</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px]">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
            ) : (
              <>
                <button onClick={toggleAll}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 text-xs font-medium text-gray-500">
                  {allSelected ? <CheckSquare size={15} className="text-blue-500" /> : <Square size={15} className="text-gray-300" />}
                  Seleccionar todos ({filtered.length})
                </button>
                {filtered.map((c) => (
                  <button key={c.id} onClick={() => toggle(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                    {selected.has(c.id) ? <CheckSquare size={15} className="text-blue-500 flex-shrink-0" /> : <Square size={15} className="text-gray-300 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      c.status === "cliente" ? "bg-green-100 text-green-700" :
                      c.status === "prospecto" ? "bg-blue-100 text-blue-700" :
                      c.status === "lead" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>{STATUS_LABELS[c.status]}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-10">Sin contactos con email</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Redactar</h2>
              <div className="ml-auto flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setTab("compose")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tab === "compose" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
                  Editar
                </button>
                <button onClick={() => setTab("preview")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tab === "preview" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
                  Vista previa
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {tab === "compose" ? (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Asunto</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej: Ofertas especiales para tus próximas vacaciones"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">Mensaje</label>
                    <span className="text-xs text-gray-400">Variables: <code className="bg-gray-100 px-1 rounded">{"{{nombre}}"}</code> <code className="bg-gray-100 px-1 rounded">{"{{nombre_completo}}"}</code></span>
                  </div>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)}
                    rows={10} placeholder={`Hola {{nombre}},\n\nTenemos una oferta especial para ti...\n\nSaludos,\nEquipo Hoy Viajo`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre campaña (para GA4)</label>
                  <input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="Ej: promo-mayo-2026"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">Los links del email tendrán UTM automático para medir en Analytics.</p>
                </div>
              </>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 min-h-[280px]">
                {subject && <p className="font-semibold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-200">{subject}</p>}
                {previewBody ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewBody}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Escribe el mensaje para ver la vista previa...</p>
                )}
                {previewContact && (
                  <p className="text-xs text-gray-400 mt-4 pt-2 border-t border-gray-200">Vista previa como: {previewContact.name}</p>
                )}
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <button onClick={handleSend}
              disabled={sending || !selected.size || !subject || !body}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {sending ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Send size={16} /> Enviar a {selected.size} contacto{selected.size !== 1 ? "s" : ""}</>}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="font-semibold text-gray-800">Resultado del envío</h2>
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle size={16} /> {sent} enviados
            </span>
            {failed > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                <XCircle size={16} /> {failed} fallidos
              </span>
            )}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${r.ok ? "bg-green-50" : "bg-red-50"}`}>
                {r.ok ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-500 flex-shrink-0" />}
                <span className="font-medium text-gray-700">{r.name}</span>
                <span className="text-gray-400">{r.email}</span>
                {r.error && <span className="text-xs text-red-500 ml-auto truncate max-w-xs">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
