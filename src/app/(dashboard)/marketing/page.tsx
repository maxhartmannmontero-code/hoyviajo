"use client";

import { useEffect, useState } from "react";
import {
  Plus, Send, FileText, Users, X, ChevronDown, ChevronUp,
  Globe, Camera, MessageCircle, Mail, MoreHorizontal,
  Target, Check, Lightbulb,
} from "lucide-react";
import { Campaign, Template, Contact, WeeklyKPI, MktMetrics } from "@/types";
import type { GAMonthlyData } from "@/lib/google-analytics";
import type { InstagramMonthlyData } from "@/lib/instagram";
import { formatDateTime } from "@/lib/utils";

// ─── Constants ─────────────────────────────────────────────────────────────

const KPI_FIELDS = [
  { key: "bni11s",       label: "BNI 1-a-1s",            target: 8  },
  { key: "presenciales", label: "Contactos presenciales", target: 5  },
  { key: "instaPosts",   label: "Posts Instagram",      target: 3  },
  { key: "mailings",     label: "Campañas email",         target: 1  },
  { key: "whatsappMsgs", label: "Mensajes WhatsApp",      target: 20 },
  { key: "cotizaciones", label: "Cotizaciones enviadas",  target: 3  },
  { key: "cierres",      label: "Cierres (ventas)",       target: 1  },
] as const;

type KPIKey = (typeof KPI_FIELDS)[number]["key"];
type KPIForm = Record<KPIKey, number>;

const EMPTY_KPI: KPIForm = {
  bni11s: 0, presenciales: 0, instaPosts: 0, mailings: 0,
  whatsappMsgs: 0, cotizaciones: 0, cierres: 0,
};

const CHANNEL_CONFIG = [
  {
    key: "web", label: "Web", Icon: Globe, bg: "bg-blue-50", text: "text-blue-600",
    fields: [
      { key: "webSessions",  label: "Sesiones"           },
      { key: "webInquiries", label: "Consultas recibidas" },
    ],
  },
  {
    key: "rrss", label: "RRSS (Instagram)", Icon: Camera, bg: "bg-purple-50", text: "text-purple-600",
    fields: [
      { key: "rrssFollowers",   label: "Seguidores"    },
      { key: "rrssReach",       label: "Alcance"       },
      { key: "rrssEngagements", label: "Interacciones" },
    ],
  },
  {
    key: "wsp", label: "WhatsApp Business", Icon: MessageCircle, bg: "bg-green-50", text: "text-green-600",
    fields: [
      { key: "wspConversations", label: "Conversaciones"  },
      { key: "wspNewContacts",   label: "Nuevos contactos" },
    ],
  },
  {
    key: "email", label: "Email Marketing", Icon: Mail, bg: "bg-orange-50", text: "text-orange-600",
    fields: [
      { key: "emailSent",   label: "Emails enviados" },
      { key: "emailOpens",  label: "Aperturas (%)"  },
      { key: "emailClicks", label: "Clics (%)"      },
    ],
  },
  {
    key: "otros", label: "Otros canales", Icon: MoreHorizontal, bg: "bg-gray-50", text: "text-gray-600",
    fields: [
      { key: "otrosNotes", label: "Notas (BNI, volantes, etc.)" },
    ],
  },
] as const;

type MetricsFormData = Omit<MktMetrics, "id" | "createdAt">;

const EMPTY_METRICS = (month: string): MetricsFormData => ({
  month, webSessions: 0, webInquiries: 0, rrssFollowers: 0,
  rrssReach: 0, rrssEngagements: 0, wspConversations: 0,
  wspNewContacts: 0, emailSent: 0, emailOpens: 0, emailClicks: 0, otrosNotes: "",
});

const STATUS_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600", enviando: "bg-yellow-100 text-yellow-700",
  enviado: "bg-green-100 text-green-700", pausado: "bg-red-100 text-red-600",
};
const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador", enviando: "Enviando", enviado: "Enviado", pausado: "Pausado",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}

function formatWeek(monday: string): string {
  const d = new Date(monday + "T00:00:00");
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  return `${fmt(d)} – ${fmt(end)}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

// ─── ProgressBar ───────────────────────────────────────────────────────────

function ProgressBar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const color =
    pct >= 100 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-yellow-400" : "bg-gray-300";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{value} / {target}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── MetricsModal ──────────────────────────────────────────────────────────

function MetricsModal({
  month,
  existing,
  onClose,
  onSave,
}: {
  month: string;
  existing: MktMetrics | undefined;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<MetricsFormData>(
    existing ? { ...existing } : EMPTY_METRICS(month)
  );
  const [saving, setSaving] = useState(false);

  function setNum(key: keyof MetricsFormData, val: string) {
    setForm((f) => ({ ...f, [key]: key === "otrosNotes" ? val : parseInt(val) || 0 }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/mkt-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, month }),
      });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">
            Métricas de {new Date(month + "-15").toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            <Globe size={13} className="shrink-0" />
            <span>Las métricas de <strong>Web</strong> se cargan automáticamente desde Google Analytics. Aquí registra los otros canales.</span>
          </div>
          {CHANNEL_CONFIG.filter(({ key }) => key !== "web").map(({ key, label, Icon, bg, text, fields }) => (
            <div key={key}>
              <div className={`flex items-center gap-2 mb-3 px-2 py-1 rounded-lg w-fit ${bg}`}>
                <Icon size={14} className={text} />
                <span className={`text-xs font-semibold ${text}`}>{label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    {f.key === "otrosNotes" ? (
                      <textarea
                        value={String((form as Record<string, string | number>)[f.key] ?? "")}
                        onChange={(e) => setNum(f.key as keyof MetricsFormData, e.target.value)}
                        rows={2}
                        className="w-full col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    ) : (
                      <input
                        type="number" min={0}
                        value={(form as Record<string, string | number>)[f.key] ?? 0}
                        onChange={(e) => setNum(f.key as keyof MetricsFormData, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
            <Check size={14} /> {saving ? "Guardando..." : "Guardar métricas"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DashboardTab ──────────────────────────────────────────────────────────

function DashboardTab({ metrics, onRefresh }: { metrics: MktMetrics[]; onRefresh: () => void }) {
  const [month, setMonth] = useState(currentMonth());
  const [showModal, setShowModal] = useState(false);
  const [gaByMonth, setGaByMonth] = useState<Record<string, GAMonthlyData>>({});
  const [gaConfigured, setGaConfigured] = useState(true);
  const [gaLoading, setGaLoading] = useState(true);
  const [gaError, setGaError] = useState<string | null>(null);
  const [igData, setIgData] = useState<InstagramMonthlyData | null>(null);
  const [igConfigured, setIgConfigured] = useState(true);
  const [igLoading, setIgLoading] = useState(true);

  const existing = metrics.find((m) => m.month === month);

  useEffect(() => {
    const end = new Date().toISOString().slice(0, 10);
    fetch(`/api/analytics?start=2025-04-01&end=${end}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error === "not_configured") { setGaConfigured(false); return; }
        if (data?.error) { setGaError(data.error); return; }
        if (Array.isArray(data)) {
          const map: Record<string, GAMonthlyData> = {};
          for (const row of data) map[row.month] = row;
          setGaByMonth(map);
          if (Object.keys(map).length === 0) setGaError("Sin datos en el período — GA4 puede ser nuevo o sin tráfico aún");
        }
      })
      .catch((e) => setGaError(String(e)))
      .finally(() => setGaLoading(false));

    fetch("/api/instagram")
      .then((r) => r.json())
      .then((data) => {
        if (data?.error === "not_configured") { setIgConfigured(false); return; }
        if (data && !data.error) setIgData(data as InstagramMonthlyData);
      })
      .catch(() => {})
      .finally(() => setIgLoading(false));
  }, []);

  const gaMonth = gaByMonth[month];

  const months = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2025, 3 + i, 1);
    return d.toISOString().slice(0, 7);
  }).reverse();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">Mes:</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(m + "-15").toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
          {gaConfigured && !gaLoading && Object.keys(gaByMonth).length > 0 && (
            <span className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-full">
              <Globe size={11} /> Google Analytics conectado
            </span>
          )}
          {gaConfigured && !gaLoading && gaError && (
            <span className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-full" title={gaError}>
              <Globe size={11} /> GA4: {gaError.slice(0, 60)}
            </span>
          )}
          {igConfigured && !igLoading && igData && (
            <span className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-full">
              <Camera size={11} /> Instagram conectado
            </span>
          )}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
          <Plus size={15} /> {existing ? "Editar RRSS / Email / WhatsApp" : "Registrar RRSS / Email / WhatsApp"}
        </button>
      </div>

      {!gaConfigured && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <Globe size={18} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Google Analytics no configurado</p>
            <p className="text-xs text-orange-600 mt-1">
              Para ver datos reales de hoyviajo.cl, agrega tu Property ID en <code className="bg-orange-100 px-1 rounded">.env.local</code>:
            </p>
            <code className="text-xs bg-orange-100 px-2 py-1 rounded block mt-1 text-orange-800">
              GOOGLE_ANALYTICS_PROPERTY_ID=123456789
            </code>
            <p className="text-xs text-orange-500 mt-1">
              Encuéntralo en Google Analytics → Admin → Property → Property details.
            </p>
          </div>
        </div>
      )}

      {!igConfigured && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3">
          <Camera size={18} className="text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Instagram no conectado</p>
            <p className="text-xs text-purple-600 mt-1">
              Para ver seguidores y alcance en tiempo real, agrega en <code className="bg-purple-100 px-1 rounded">.env.local</code>:
            </p>
            <code className="text-xs bg-purple-100 px-2 py-1 rounded block mt-1 text-purple-800 whitespace-pre">
              META_ACCESS_TOKEN=tu_token{"\n"}INSTAGRAM_ACCOUNT_ID=tu_id_de_cuenta
            </code>
            <p className="text-xs text-purple-500 mt-1">
              Obtenlos en developers.facebook.com → Graph API Explorer.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CHANNEL_CONFIG.map(({ key, label, Icon, bg, text, fields }) => {
          // Web card: overlay with live GA4 data if available
          if (key === "web" && gaMonth) {
            return (
              <div key="web" className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 ring-1 ring-orange-200/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-blue-50"><Globe size={16} className="text-blue-600" /></div>
                  <span className="font-medium text-gray-900 text-sm">Web</span>
                  <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    Live GA4
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Sesiones",         value: Math.round(gaMonth.sessions)    },
                    { label: "Usuarios activos",  value: Math.round(gaMonth.activeUsers) },
                    { label: "Páginas vistas",    value: Math.round(gaMonth.pageViews)   },
                    { label: "Nuevos usuarios",   value: Math.round(gaMonth.newUsers)    },
                    { label: "Tasa de rebote",    value: `${Math.round(gaMonth.bounceRate * 100)}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-orange-400 mt-3 flex items-center gap-1">
                  <Globe size={10} /> Datos directos de Google Analytics
                </p>
              </div>
            );
          }

          // RRSS card: show live Instagram data if available
          if (key === "rrss" && igData && !igLoading) {
            return (
              <div key="rrss" className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 ring-1 ring-purple-200/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-purple-50"><Camera size={16} className="text-purple-600" /></div>
                  <span className="font-medium text-gray-900 text-sm">RRSS (Instagram)</span>
                  <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    Live Meta
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Seguidores",    value: igData.followersCount.toLocaleString("es-CL") },
                    { label: "Publicaciones", value: igData.mediaCount.toLocaleString("es-CL")     },
                    { label: "Alcance",       value: igData.reach.toLocaleString("es-CL")          },
                    { label: "Impresiones",   value: igData.impressions.toLocaleString("es-CL")    },
                    { label: "Visitas perfil",value: igData.profileViews.toLocaleString("es-CL")   },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-purple-400 mt-3 flex items-center gap-1">
                  <Camera size={10} /> Datos directos de Meta Graph API
                </p>
              </div>
            );
          }

          const existingAny = existing as unknown as Record<string, string | number>;
          const hasData = existing && fields.some((f) =>
            f.key === "otrosNotes"
              ? Boolean(existingAny[f.key])
              : (existingAny[f.key] as number) > 0
          );
          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${bg}`}><Icon size={16} className={text} /></div>
                <span className="font-medium text-gray-900 text-sm">{label}</span>
                {key === "web" && gaLoading && (
                  <span className="ml-auto text-xs text-gray-400 animate-pulse">cargando GA4...</span>
                )}
                {key === "web" && !gaLoading && !gaMonth && (
                  <span className="ml-auto text-xs text-gray-400 italic">Sin datos GA4</span>
                )}
                {key === "rrss" && igLoading && (
                  <span className="ml-auto text-xs text-gray-400 animate-pulse">cargando Instagram...</span>
                )}
                {key !== "web" && key !== "rrss" && !hasData && (
                  <span className="ml-auto text-xs text-gray-400 italic">Sin datos</span>
                )}
                {key === "rrss" && !igLoading && !igData && !hasData && (
                  <span className="ml-auto text-xs text-gray-400 italic">Sin datos</span>
                )}
              </div>
              {hasData ? (
                <div className="space-y-2">
                  {fields.map((f) => {
                    const val = existingAny[f.key];
                    return (
                      <div key={f.key} className="flex justify-between text-sm">
                        <span className="text-gray-500">{f.label}</span>
                        <span className="font-semibold text-gray-800">
                          {f.key === "otrosNotes" ? (val as string) || "—" : String(val ?? 0)}
                          {(f.key === "emailOpens" || f.key === "emailClicks") ? "%" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 hover:underline">
                  + Agregar métricas de {label.toLowerCase()}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Trend table — GA4 sessions + manual metrics */}
      {(metrics.length > 0 || Object.keys(gaByMonth).length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tendencia de tráfico web (últimos 6 meses)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="py-2 text-left">Mes</th>
                  <th className="py-2 text-right">Sesiones</th>
                  <th className="py-2 text-right">Usuarios</th>
                  <th className="py-2 text-right">WSP nuevos</th>
                  <th className="py-2 text-right">Email abiertos</th>
                  <th className="py-2 text-right">RRSS seguidores</th>
                </tr>
              </thead>
              <tbody>
                {months.slice(0, 6).map((m) => {
                  const ga = gaByMonth[m];
                  const manual = metrics.find((mx) => mx.month === m);
                  return (
                    <tr key={m} className="border-b border-gray-50">
                      <td className="py-2 text-gray-600 flex items-center gap-1">
                        {new Date(m + "-15").toLocaleDateString("es-CL", { month: "short", year: "2-digit" })}
                        {ga && <span className="text-orange-400 text-[10px]">GA4</span>}
                      </td>
                      <td className="py-2 text-right font-medium">{ga ? Math.round(ga.sessions) : (manual?.webSessions || "—")}</td>
                      <td className="py-2 text-right font-medium">{ga ? Math.round(ga.activeUsers) : "—"}</td>
                      <td className="py-2 text-right font-medium">{manual?.wspNewContacts || "—"}</td>
                      <td className="py-2 text-right font-medium">{manual?.emailOpens ? `${manual.emailOpens}%` : "—"}</td>
                      <td className="py-2 text-right font-medium">
                        {igData
                          ? <span className="text-purple-600">{igData.followersCount.toLocaleString("es-CL")}</span>
                          : manual?.rrssFollowers || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <MetricsModal month={month} existing={existing} onClose={() => setShowModal(false)} onSave={onRefresh} />
      )}
    </div>
  );
}

// ─── KPITab ────────────────────────────────────────────────────────────────

function KPITab({ kpis, onRefresh }: { kpis: WeeklyKPI[]; onRefresh: () => void }) {
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const existing = kpis.find((k) => k.weekStart === weekStart);
  const [form, setForm] = useState<KPIForm>(existing ? { ...existing } : { ...EMPTY_KPI });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const found = kpis.find((k) => k.weekStart === weekStart);
    setForm(found ? { ...found } : { ...EMPTY_KPI });
  }, [weekStart, kpis]);

  async function handleSave() {
    setSaving(true);
    try {
      if (existing) {
        await fetch(`/api/kpis/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/kpis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekStart, ...form }),
        });
      }
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  const CLOSE_RATE = 0.35;
  const AVG_COMMISSION = 115000;
  const projCommission = form.cotizaciones * 4.33 * CLOSE_RATE * AVG_COMMISSION;
  const GOAL = 4000000;
  const pctGoal = Math.min((projCommission / GOAL) * 100, 100);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="font-semibold text-gray-900">Actividad semanal</h3>
            {weekStart && <p className="text-xs text-gray-400 mt-0.5">{formatWeek(weekStart)}</p>}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Semana del:</label>
            <input type="date" value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
          {KPI_FIELDS.map(({ key, label, target }) => (
            <div key={key} className="text-center">
              <label className="text-xs text-gray-500 block mb-1 leading-tight">{label}</label>
              <input type="number" min={0}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-xs text-gray-400">meta: {target}</span>
            </div>
          ))}
        </div>

        <div className="mb-5">
          {KPI_FIELDS.map(({ key, label, target }) => (
            <ProgressBar key={key} label={label} value={form[key]} target={target} />
          ))}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
          <Check size={15} /> {saving ? "Guardando..." : existing ? "Actualizar semana" : "Guardar semana"}
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Proyección mensual estimada</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center bg-white/60 rounded-xl py-3">
            <p className="text-2xl font-bold text-gray-900">{Math.round(form.cotizaciones * 4.33)}</p>
            <p className="text-xs text-gray-500 mt-1">Cotizaciones / mes</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl py-3">
            <p className="text-2xl font-bold text-blue-700">{Math.round(form.cotizaciones * 4.33 * CLOSE_RATE)}</p>
            <p className="text-xs text-gray-500 mt-1">Cierres est. (35%)</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl py-3">
            <p className="text-xl font-bold text-green-700">{fmtCLP(projCommission)}</p>
            <p className="text-xs text-gray-500 mt-1">Comisión est.</p>
          </div>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Hacia meta mensual de $4.000.000 en comisiones</span>
            <span className="font-semibold">{Math.round(pctGoal)}%</span>
          </div>
          <div className="w-full h-3 bg-white/70 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${pctGoal >= 100 ? "bg-green-500" : pctGoal >= 60 ? "bg-blue-500" : "bg-yellow-400"}`}
              style={{ width: `${pctGoal}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          * Asume 35% tasa de cierre y $115.000 comisión promedio por venta
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <button onClick={() => setShowHistory((v) => !v)}
          className="flex items-center justify-between w-full px-6 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-2xl">
          <span>Historial de semanas ({kpis.length} registros)</span>
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showHistory && kpis.length > 0 && (
          <div className="px-6 pb-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-gray-400 font-medium">Semana</th>
                  {KPI_FIELDS.map(({ key, label }) => (
                    <th key={key} className="py-2 text-right text-gray-400 font-medium">
                      {label.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...kpis]
                  .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
                  .slice(0, 12)
                  .map((kpi) => (
                    <tr key={kpi.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setWeekStart(kpi.weekStart)}>
                      <td className="py-2 text-gray-600">{formatWeek(kpi.weekStart)}</td>
                      {KPI_FIELDS.map(({ key, target }) => (
                        <td key={key} className={`py-2 text-right font-medium ${kpi[key] >= target ? "text-green-600" : "text-gray-700"}`}>
                          {kpi[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {showHistory && kpis.length === 0 && (
          <p className="px-6 pb-5 text-sm text-gray-400">Aún no hay semanas registradas.</p>
        )}
      </div>
    </div>
  );
}

// ─── StrategyTab ────────────────────────────────────────────────────────────

function StrategyTab() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb size={17} className="text-yellow-500" /> Identidad de marca — Hoy Viajo
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Voz y tono</p>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li>• Cercano y de confianza, no corporativo</li>
              <li>• Experto que simplifica el proceso de viaje</li>
              <li>• Entusiasta y orientado a experiencias</li>
              <li>• Personalizado — nunca genérico</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mensajes clave</p>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li>• "Te diseñamos el viaje perfecto"</li>
              <li>• Comisión pagada por proveedor, no por cliente</li>
              <li>• Servicio personalizado vs. OTAs impersonales</li>
              <li>• Red internacional IATA + experiencia local</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Pilares de contenido</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Inspiración", desc: "Destinos, fotos, experiencias reales", color: "bg-blue-50 text-blue-700" },
            { label: "Educación", desc: "Tips, cómo ahorrar, proceso de compra", color: "bg-purple-50 text-purple-700" },
            { label: "Testimonios", desc: "Fotos clientes, reseñas, historias", color: "bg-green-50 text-green-700" },
            { label: "Ofertas", desc: "Promos temporada, ventas flash, BNI", color: "bg-orange-50 text-orange-700" },
          ].map((p) => (
            <div key={p.label} className={`rounded-xl p-4 ${p.color}`}>
              <p className="font-semibold text-sm mb-1">{p.label}</p>
              <p className="text-xs opacity-80">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Calendario de temporadas clave</h3>
        <div className="space-y-0">
          {[
            { period: "Oct–Nov", action: "Campaña verano: vuelos, resorts, internacionales", badge: "Alta", color: "bg-orange-100 text-orange-700" },
            { period: "Dic–Mar", action: "Temporada alta: grupos familiares y corporativos", badge: "Pico", color: "bg-red-100 text-red-700" },
            { period: "May",     action: "Campaña vacaciones invierno: colegios y familias", badge: "Alta", color: "bg-orange-100 text-orange-700" },
            { period: "Jun–Jul", action: "Ski, nieve, Sur de Chile y destinos de invierno", badge: "Pico", color: "bg-red-100 text-red-700" },
            { period: "Ago",     action: "Preparar campaña Fiestas Patrias: escapadas cortas", badge: "Media", color: "bg-blue-100 text-blue-700" },
            { period: "Sep",     action: "Fiestas Patrias: nacional + experiencias gastronómicas", badge: "Alta", color: "bg-orange-100 text-orange-700" },
          ].map((item) => (
            <div key={item.period} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-xs font-semibold text-gray-400 w-14 shrink-0">{item.period}</span>
              <span className="text-sm text-gray-700 flex-1">{item.action}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.color}`}>{item.badge}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Canales activos y estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: "Instagram", detail: "@hoyviajo — 3 posts/semana", status: "activo" },
            { name: "Web Hoy Viajo", detail: "SEO en construcción orgánica", status: "activo" },
            { name: "BNI", detail: "Red principal — 60% de ventas", status: "activo" },
            { name: "WhatsApp Business", detail: "Seguimiento y cotizaciones", status: "activo" },
            { name: "Email Marketing", detail: "Campañas bimensuales", status: "activo" },
            { name: "Google / Meta Ads", detail: "Planificado cuando SEO madure", status: "pendiente" },
          ].map((c) => (
            <div key={c.name} className="p-3 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.status === "activo" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TemplateModal ─────────────────────────────────────────────────────────

function TemplateModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: "", subject: "", body: "", tags: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [] }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Nueva Plantilla</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Asunto *</label>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Cuerpo *</label>
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={6} placeholder="HTML o texto plano"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tags (separados por coma)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="promocion, bienvenida, seguimiento"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

// ─── CampaignModal ─────────────────────────────────────────────────────────

function CampaignModal({
  templates, contacts, onClose, onSave,
}: { templates: Template[]; contacts: Contact[]; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: "", subject: "", body: "", selectedContacts: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState("");

  function applyTemplate(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setForm((f) => ({ ...f, subject: tpl.subject, body: tpl.body }));
    setTemplateId(id);
  }

  function toggleContact(id: string) {
    setForm((f) => ({
      ...f,
      selectedContacts: f.selectedContacts.includes(id)
        ? f.selectedContacts.filter((c) => c !== id)
        : [...f.selectedContacts, id],
    }));
  }

  async function handleSubmit(send: boolean) {
    setSaving(true);
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, subject: form.subject, htmlBody: form.body,
        recipientIds: form.selectedContacts, status: send ? "enviando" : "borrador",
      }),
    });
    setSaving(false);
    onSave();
    onClose();
  }

  const contactsWithEmail = contacts.filter((c) => c.email);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Nueva Campaña</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {templates.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Usar plantilla</label>
              <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar plantilla...</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Asunto *</label>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Cuerpo</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={8} placeholder="HTML o texto plano..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Destinatarios ({form.selectedContacts.length} seleccionados)
            </label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
              {contactsWithEmail.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox"
                    checked={form.selectedContacts.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="rounded" />
                  <div>
                    <p className="text-sm text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </div>
                </label>
              ))}
              {contactsWithEmail.length === 0 && (
                <p className="text-center py-4 text-xs text-gray-400">No hay contactos con email</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button type="button" disabled={saving} onClick={() => handleSubmit(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50">
            Guardar Borrador
          </button>
          <button type="button" disabled={saving || form.selectedContacts.length === 0}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Send size={14} /> Enviar Ahora
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

type Tab = "dashboard" | "kpis" | "strategy" | "campaigns" | "templates";

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard",  label: "Dashboard"    },
  { key: "kpis",       label: "KPIs"         },
  { key: "strategy",   label: "Estrategia"   },
  { key: "campaigns",  label: "Campañas"     },
  { key: "templates",  label: "Plantillas"   },
];

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [kpis, setKPIs] = useState<WeeklyKPI[]>([]);
  const [metrics, setMetrics] = useState<MktMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  async function fetchData() {
    const [camp, tpl, cont, k, m] = await Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/kpis").then((r) => r.json()),
      fetch("/api/mkt-metrics").then((r) => r.json()),
    ]);
    setCampaigns(Array.isArray(camp) ? camp : []);
    setTemplates(Array.isArray(tpl) ? tpl : []);
    setContacts(Array.isArray(cont) ? cont : []);
    setKPIs(Array.isArray(k) ? k : []);
    setMetrics(Array.isArray(m) ? m : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const tabLabel = (key: Tab) => {
    if (key === "campaigns") return `Campañas (${campaigns.length})`;
    if (key === "templates") return `Plantillas (${templates.length})`;
    if (key === "kpis") return `KPIs (${kpis.length}sem)`;
    return TABS.find((t) => t.key === key)?.label ?? key;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-sm text-gray-500 mt-1">Resultados, KPIs semanales y estrategia digital</p>
        </div>
        {(tab === "campaigns" || tab === "templates") && (
          <div className="flex gap-2">
            <button onClick={() => setShowTemplate(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
              <FileText size={16} /> Nueva Plantilla
            </button>
            <button onClick={() => setShowCampaign(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              <Plus size={16} /> Nueva Campaña
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map(({ key }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {tabLabel(key)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : tab === "dashboard" ? (
        <DashboardTab metrics={metrics} onRefresh={fetchData} />
      ) : tab === "kpis" ? (
        <KPITab kpis={kpis} onRefresh={fetchData} />
      ) : tab === "strategy" ? (
        <StrategyTab />
      ) : tab === "campaigns" ? (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Send size={40} className="mx-auto mb-3 opacity-30" />
              <p>No hay campañas aún. Crea una para comenzar.</p>
            </div>
          ) : (
            campaigns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <Send size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Asunto: {c.subject}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {c.recipientCount > 0 && (
                      <span className="flex items-center gap-1"><Users size={12} />{c.recipientCount} destinatarios</span>
                    )}
                    {c.sentAt && <span>Enviado: {formatDateTime(c.sentAt)}</span>}
                    <span>Creado: {formatDateTime(c.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p>No hay plantillas aún.</p>
            </div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-gray-400" />
                  <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                </div>
                <p className="text-xs text-gray-500 mb-2">Asunto: {t.subject}</p>
                <p className="text-xs text-gray-400 line-clamp-2">{t.body.replace(/<[^>]+>/g, "")}</p>
                {t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showCampaign && (
        <CampaignModal templates={templates} contacts={contacts} onClose={() => setShowCampaign(false)} onSave={fetchData} />
      )}
      {showTemplate && (
        <TemplateModal onClose={() => setShowTemplate(false)} onSave={fetchData} />
      )}
    </div>
  );
}
