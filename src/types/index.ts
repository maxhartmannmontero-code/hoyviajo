export type ContactStatus = "lead" | "prospecto" | "cliente" | "inactivo";
export type ActivityType = "llamada" | "email" | "reunion" | "nota" | "tarea";
export type ActivityStatus = "pendiente" | "completado" | "cancelado";
export type DealStage = "lead" | "contactado" | "propuesta" | "negociacion" | "cerrado_ganado" | "cerrado_perdido";
export type CampaignStatus = "borrador" | "enviando" | "enviado" | "pausado";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  tags: string[];
  status: ContactStatus;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  contactId: string;
  contactName: string;
  type: ActivityType;
  notes: string;
  date: string;
  status: ActivityStatus;
  nextFollowUp: string;
  createdAt: string;
}

export type VoucherType = "vuelo" | "alojamiento" | "traslado" | "otro";

export interface Voucher {
  id: string;
  contactId: string;
  contactName: string;
  fileName: string;
  driveFileId: string;
  driveUrl: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  createdAt: string;
  checkIn: string;
  checkOut: string;
  calendarEventId: string;
  notes: string;
  voucherType: VoucherType;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  sentAt: string;
  recipientCount: number;
  openRate: number;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  tags: string[];
  createdAt: string;
}

export interface Deal {
  id: string;
  contactId: string;
  contactName: string;
  dealName: string;
  amount: number;
  currency: string;
  stage: DealStage;
  probability: number;
  closeDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  saleDate: string;
  travelDate: string;
  product: string;
  detail: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  partner: string;
  commission: number;
  notes: string;
  createdAt: string;
}

export interface DashboardStats {
  totalContacts: number;
  activeDeals: number;
  pendingFollowUps: number;
  totalRevenue: number;
  newContactsThisMonth: number;
  dealsClosedThisMonth: number;
}

export type ExpenseCategory = "publicidad" | "bni" | "comunicaciones" | "traslados" | "servicios" | "otros";

export type BankTxStatus = "pendiente" | "conciliado" | "ignorado";

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  docNumber: string;
  debit: number;
  credit: number;
  balance: number;
  matchedId: string;
  matchedType: "sale" | "expense" | "";
  matchedLabel: string;
  status: BankTxStatus;
  importedAt: string;
}

export interface Expense {
  id: string;
  month: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  createdAt: string;
}

export interface WeeklyKPI {
  id: string;
  weekStart: string;
  bni11s: number;
  presenciales: number;
  instaPosts: number;
  mailings: number;
  whatsappMsgs: number;
  cotizaciones: number;
  cierres: number;
  createdAt: string;
}

export interface MktMetrics {
  id: string;
  month: string;
  periodFrom: string;
  periodTo: string;
  webSessions: number;
  webInquiries: number;
  rrssViews: number;
  rrssReach: number;
  rrssEngagements: number;
  rrssNewFollowers: number;
  wspConversations: number;
  wspNewContacts: number;
  emailSent: number;
  emailOpens: number;
  emailClicks: number;
  otrosNotes: string;
  createdAt: string;
}
