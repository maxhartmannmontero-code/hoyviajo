import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  prospecto: "Prospecto",
  cliente: "Cliente",
  inactivo: "Inactivo",
};

export const CONTACT_STATUS_COLORS: Record<string, string> = {
  lead: "bg-[#ddeef9] text-[#3c93d6]",
  prospecto: "bg-yellow-100 text-yellow-700",
  cliente: "bg-green-100 text-green-700",
  inactivo: "bg-gray-100 text-gray-500",
};

export const DEAL_STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  contactado: "Contactado",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  cerrado_ganado: "Cerrado Ganado",
  cerrado_perdido: "Cerrado Perdido",
};

export const DEAL_STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-100 text-gray-600",
  contactado: "bg-blue-100 text-blue-700",
  propuesta: "bg-purple-100 text-purple-700",
  negociacion: "bg-orange-100 text-orange-700",
  cerrado_ganado: "bg-green-100 text-green-700",
  cerrado_perdido: "bg-red-100 text-red-700",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  llamada: "Llamada",
  email: "Email",
  reunion: "Reunión",
  nota: "Nota",
  tarea: "Tarea",
};

export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  llamada: "Phone",
  email: "Mail",
  reunion: "Calendar",
  nota: "FileText",
  tarea: "CheckSquare",
};
