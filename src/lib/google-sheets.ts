import { google } from "googleapis";
import { Contact, Activity, Voucher, Campaign, Template, Deal, Sale, WeeklyKPI, MktMetrics, Expense, ExpenseCategory, BankTransaction, BankTxStatus } from "@/types";
import { generateId } from "./utils";
import { getCached, setCached, invalidateCache } from "./cache";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

function getSheets(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function readSheet(accessToken: string, range: string): Promise<string[][]> {
  const cacheKey = `sheet:${range}`;
  const cached = getCached<string[][]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const data = (res.data.values ?? []) as string[][];
  setCached(cacheKey, data);
  return data;
}

function invalidateSheet(sheetName: string) {
  invalidateCache(`sheet:${sheetName}!`);
}

async function appendRow(accessToken: string, sheet: string, values: string[]): Promise<void> {
  const sheets = getSheets(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
  invalidateSheet(sheet);
}

async function updateRow(
  accessToken: string,
  sheet: string,
  rowIndex: number,
  values: string[]
): Promise<void> {
  const sheets = getSheets(accessToken);
  const col = String.fromCharCode(64 + values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A${rowIndex}:${col}${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
  invalidateSheet(sheet);
}

async function deleteRow(accessToken: string, sheetId: number, rowIndex: number, sheetName: string): Promise<void> {
  const sheets = getSheets(accessToken);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
  invalidateSheet(sheetName);
}

// ─── Contacts ──────────────────────────────────────────────────────────────

function rowToContact(row: string[]): Contact {
  return {
    id: row[0],
    name: row[1],
    email: row[2],
    phone: row[3],
    company: row[4],
    role: row[5],
    tags: row[6] ? row[6].split(",") : [],
    status: (row[7] as Contact["status"]) || "lead",
    source: row[8] || "",
    notes: row[9] || "",
    createdAt: row[10] || "",
    updatedAt: row[11] || "",
  };
}

export async function getContacts(accessToken: string): Promise<Contact[]> {
  const rows = await readSheet(accessToken, "Contacts!A2:L");
  return rows.filter((r) => r[0]).map(rowToContact);
}

export async function bulkCreateContacts(
  accessToken: string,
  contacts: Omit<Contact, "id" | "createdAt" | "updatedAt">[]
): Promise<number> {
  if (contacts.length === 0) return 0;
  const sheets = getSheets(accessToken);
  const now = new Date().toISOString();
  const values = contacts.map((c) => [
    generateId(), c.name, c.email, c.phone, c.company, c.role,
    c.tags.join(","), c.status, c.source, c.notes, now, now,
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Contacts!A1",
    valueInputOption: "RAW",
    requestBody: { values },
  });
  invalidateSheet("Contacts");
  return values.length;
}

export async function createContact(
  accessToken: string,
  data: Omit<Contact, "id" | "createdAt" | "updatedAt">
): Promise<Contact> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [
    id, data.name, data.email, data.phone, data.company, data.role,
    data.tags.join(","), data.status, data.source, data.notes, now, now,
  ];
  await appendRow(accessToken, "Contacts", row);
  return { ...data, id, createdAt: now, updatedAt: now };
}

export async function updateContact(
  accessToken: string,
  id: string,
  data: Partial<Contact>
): Promise<void> {
  const rows = await readSheet(accessToken, "Contacts!A2:L");
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error("Contact not found");
  const existing = rowToContact(rows[rowIndex]);
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await updateRow(accessToken, "Contacts", rowIndex + 2, [
    updated.id, updated.name, updated.email, updated.phone, updated.company,
    updated.role, updated.tags.join(","), updated.status, updated.source,
    updated.notes, updated.createdAt, updated.updatedAt,
  ]);
}

// ─── Activities ────────────────────────────────────────────────────────────

function rowToActivity(row: string[]): Activity {
  return {
    id: row[0], contactId: row[1], contactName: row[2],
    type: (row[3] as Activity["type"]) || "nota",
    notes: row[4] || "", date: row[5] || "",
    status: (row[6] as Activity["status"]) || "pendiente",
    nextFollowUp: row[7] || "", createdAt: row[8] || "",
  };
}

export async function getActivities(accessToken: string, contactId?: string): Promise<Activity[]> {
  const rows = await readSheet(accessToken, "Activities!A2:I");
  const activities = rows.filter((r) => r[0]).map(rowToActivity);
  return contactId ? activities.filter((a) => a.contactId === contactId) : activities;
}

export async function createActivity(
  accessToken: string,
  data: Omit<Activity, "id" | "createdAt">
): Promise<Activity> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [id, data.contactId, data.contactName, data.type, data.notes, data.date, data.status, data.nextFollowUp, now];
  await appendRow(accessToken, "Activities", row);
  return { ...data, id, createdAt: now };
}

// ─── Vouchers ──────────────────────────────────────────────────────────────

function rowToVoucher(row: string[]): Voucher {
  return {
    id: row[0], contactId: row[1], contactName: row[2], fileName: row[3],
    driveFileId: row[4], driveUrl: row[5], amount: parseFloat(row[6]) || 0,
    currency: row[7] || "USD", date: row[8] || "", description: row[9] || "",
    createdAt: row[10] || "", checkIn: row[11] || "", checkOut: row[12] || "",
    calendarEventId: row[13] || "",
  };
}

export async function getVouchers(accessToken: string, contactId?: string): Promise<Voucher[]> {
  const rows = await readSheet(accessToken, "Vouchers!A2:N");
  const vouchers = rows.filter((r) => r[0]).map(rowToVoucher);
  return contactId ? vouchers.filter((v) => v.contactId === contactId) : vouchers;
}

export async function createVoucher(
  accessToken: string,
  data: Omit<Voucher, "id" | "createdAt">
): Promise<Voucher> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [
    id, data.contactId, data.contactName, data.fileName, data.driveFileId, data.driveUrl,
    String(data.amount), data.currency, data.date, data.description, now,
    data.checkIn || "", data.checkOut || "", data.calendarEventId || "",
  ];
  await appendRow(accessToken, "Vouchers", row);
  return { ...data, id, createdAt: now };
}

export async function setVoucherCalendarEvent(
  accessToken: string,
  voucherId: string,
  calendarEventId: string
): Promise<void> {
  const rows = await readSheet(accessToken, "Vouchers!A2:N");
  const rowIndex = rows.findIndex((r) => r[0] === voucherId);
  if (rowIndex === -1) throw new Error("Voucher not found");
  const v = rowToVoucher(rows[rowIndex]);
  await updateRow(accessToken, "Vouchers", rowIndex + 2, [
    v.id, v.contactId, v.contactName, v.fileName, v.driveFileId, v.driveUrl,
    String(v.amount), v.currency, v.date, v.description, v.createdAt,
    v.checkIn, v.checkOut, calendarEventId,
  ]);
}

export async function deleteVoucher(accessToken: string, id: string): Promise<{ driveFileId: string; calendarEventId: string }> {
  const sheets = getSheets(accessToken);
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === "Vouchers");
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) throw new Error("Vouchers sheet not found");
  const rows = await readSheet(accessToken, "Vouchers!A2:N");
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error("Voucher not found");
  const v = rowToVoucher(rows[rowIndex]);
  await deleteRow(accessToken, sheetId, rowIndex + 2, "Vouchers");
  return { driveFileId: v.driveFileId, calendarEventId: v.calendarEventId };
}

// ─── Campaigns ─────────────────────────────────────────────────────────────

function rowToCampaign(row: string[]): Campaign {
  return {
    id: row[0], name: row[1], subject: row[2], body: row[3],
    status: (row[4] as Campaign["status"]) || "borrador",
    sentAt: row[5] || "", recipientCount: parseInt(row[6]) || 0,
    openRate: parseFloat(row[7]) || 0, createdAt: row[8] || "",
  };
}

export async function getCampaigns(accessToken: string): Promise<Campaign[]> {
  const rows = await readSheet(accessToken, "Campaigns!A2:I");
  return rows.filter((r) => r[0]).map(rowToCampaign);
}

export async function createCampaign(
  accessToken: string,
  data: Omit<Campaign, "id" | "createdAt">
): Promise<Campaign> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [id, data.name, data.subject, data.body, data.status, data.sentAt, String(data.recipientCount), String(data.openRate), now];
  await appendRow(accessToken, "Campaigns", row);
  return { ...data, id, createdAt: now };
}

// ─── Templates ─────────────────────────────────────────────────────────────

function rowToTemplate(row: string[]): Template {
  return {
    id: row[0], name: row[1], subject: row[2], body: row[3],
    tags: row[4] ? row[4].split(",") : [], createdAt: row[5] || "",
  };
}

export async function getTemplates(accessToken: string): Promise<Template[]> {
  const rows = await readSheet(accessToken, "Templates!A2:F");
  return rows.filter((r) => r[0]).map(rowToTemplate);
}

export async function createTemplate(
  accessToken: string,
  data: Omit<Template, "id" | "createdAt">
): Promise<Template> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [id, data.name, data.subject, data.body, data.tags.join(","), now];
  await appendRow(accessToken, "Templates", row);
  return { ...data, id, createdAt: now };
}

// ─── Deals ─────────────────────────────────────────────────────────────────

function rowToDeal(row: string[]): Deal {
  return {
    id: row[0], contactId: row[1], contactName: row[2], dealName: row[3],
    amount: parseFloat(row[4]) || 0, currency: row[5] || "USD",
    stage: (row[6] as Deal["stage"]) || "lead",
    probability: parseFloat(row[7]) || 0, closeDate: row[8] || "",
    notes: row[9] || "", createdAt: row[10] || "", updatedAt: row[11] || "",
  };
}

export async function getDeals(accessToken: string): Promise<Deal[]> {
  const rows = await readSheet(accessToken, "Deals!A2:L");
  return rows.filter((r) => r[0]).map(rowToDeal);
}

export async function createDeal(
  accessToken: string,
  data: Omit<Deal, "id" | "createdAt" | "updatedAt">
): Promise<Deal> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [id, data.contactId, data.contactName, data.dealName, String(data.amount), data.currency, data.stage, String(data.probability), data.closeDate, data.notes, now, now];
  await appendRow(accessToken, "Deals", row);
  return { ...data, id, createdAt: now, updatedAt: now };
}

export async function updateDeal(
  accessToken: string,
  id: string,
  data: Partial<Deal>
): Promise<void> {
  const rows = await readSheet(accessToken, "Deals!A2:L");
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error("Deal not found");
  const existing = rowToDeal(rows[rowIndex]);
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await updateRow(accessToken, "Deals", rowIndex + 2, [
    updated.id, updated.contactId, updated.contactName, updated.dealName,
    String(updated.amount), updated.currency, updated.stage, String(updated.probability),
    updated.closeDate, updated.notes, updated.createdAt, updated.updatedAt,
  ]);
}

// ─── Sales ─────────────────────────────────────────────────────────────────

function rowToSale(row: string[]): Sale {
  return {
    id: row[0],
    saleDate: row[17] || "",
    travelDate: row[1] || "",
    product: row[2] || "",
    detail: row[3] || "",
    checkIn: row[4] || "",
    checkOut: row[5] || "",
    status: row[6] || "",
    paymentStatus: row[7] || "",
    amount: parseFloat(row[8]) || 0,
    currency: row[9] || "CLP",
    clientName: row[10] || "",
    clientEmail: row[11] || "",
    clientPhone: row[12] || "",
    partner: row[13] || "",
    commission: parseFloat(row[14]) || 0,
    notes: row[15] || "",
    createdAt: row[16] || "",
  };
}

export async function getSales(accessToken: string): Promise<Sale[]> {
  try {
    const rows = await readSheet(accessToken, "Sales!A2:R");
    return rows.filter((r) => r[0]).map(rowToSale);
  } catch {
    return [];
  }
}

export async function createSale(
  accessToken: string,
  data: Omit<Sale, "id" | "createdAt">
): Promise<Sale> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [
    id, data.travelDate, data.product, data.detail, data.checkIn, data.checkOut,
    data.status, data.paymentStatus, String(data.amount), data.currency,
    data.clientName, data.clientEmail, data.clientPhone, data.partner,
    String(data.commission), data.notes, now, data.saleDate || "",
  ];
  await appendRow(accessToken, "Sales", row);
  return { ...data, id, createdAt: now };
}

export async function clearSales(accessToken: string): Promise<void> {
  const sheets = getSheets(accessToken);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sales!A2:Z",
  });
  invalidateSheet("Sales");
}

export async function bulkCreateSales(
  accessToken: string,
  sales: Omit<Sale, "id" | "createdAt">[]
): Promise<number> {
  const sheets = getSheets(accessToken);
  const now = new Date().toISOString();
  const values = sales.map((s) => [
    generateId(), s.travelDate, s.product, s.detail, s.checkIn, s.checkOut,
    s.status, s.paymentStatus, String(s.amount), s.currency,
    s.clientName, s.clientEmail, s.clientPhone, s.partner,
    String(s.commission), s.notes, now, s.saleDate || "",
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sales!A1",
    valueInputOption: "RAW",
    requestBody: { values },
  });
  invalidateSheet("Sales");
  return values.length;
}

// ─── Expenses ──────────────────────────────────────────────────────────────

function rowToExpense(row: string[]): Expense {
  return {
    id: row[0], month: row[1],
    category: (row[2] as ExpenseCategory) || "otros",
    description: row[3] || "", amount: parseFloat(row[4]) || 0,
    createdAt: row[5] || "",
  };
}

export async function getExpenses(accessToken: string): Promise<Expense[]> {
  try {
    const rows = await readSheet(accessToken, "Expenses!A2:F");
    return rows.filter((r) => r[0]).map(rowToExpense);
  } catch {
    return [];
  }
}

export async function createExpense(
  accessToken: string,
  data: Omit<Expense, "id" | "createdAt">
): Promise<Expense> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [id, data.month, data.category, data.description, String(data.amount), now];
  await appendRow(accessToken, "Expenses", row);
  return { ...data, id, createdAt: now };
}

export async function deleteExpense(accessToken: string, id: string): Promise<void> {
  const sheets = getSheets(accessToken);
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === "Expenses");
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) throw new Error("Expenses sheet not found");
  const rows = await readSheet(accessToken, "Expenses!A2:F");
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error("Expense not found");
  await deleteRow(accessToken, sheetId, rowIndex + 2, "Expenses");
}

// ─── Weekly KPIs ───────────────────────────────────────────────────────────

function rowToKPI(row: string[]): WeeklyKPI {
  return {
    id: row[0], weekStart: row[1],
    bni11s: Number(row[2]) || 0, presenciales: Number(row[3]) || 0,
    instaPosts: Number(row[4]) || 0, mailings: Number(row[5]) || 0,
    whatsappMsgs: Number(row[6]) || 0, cotizaciones: Number(row[7]) || 0,
    cierres: Number(row[8]) || 0, createdAt: row[9] || "",
  };
}

export async function getKPIs(accessToken: string): Promise<WeeklyKPI[]> {
  try {
    const rows = await readSheet(accessToken, "KPIs!A2:J");
    return rows.filter((r) => r[0]).map(rowToKPI);
  } catch {
    return [];
  }
}

export async function createKPI(
  accessToken: string,
  data: Omit<WeeklyKPI, "id" | "createdAt">
): Promise<WeeklyKPI> {
  const now = new Date().toISOString();
  const id = generateId();
  const row = [id, data.weekStart, String(data.bni11s), String(data.presenciales),
    String(data.instaPosts), String(data.mailings), String(data.whatsappMsgs),
    String(data.cotizaciones), String(data.cierres), now];
  await appendRow(accessToken, "KPIs", row);
  return { ...data, id, createdAt: now };
}

export async function updateKPI(
  accessToken: string,
  id: string,
  data: Partial<WeeklyKPI>
): Promise<void> {
  const rows = await readSheet(accessToken, "KPIs!A2:J");
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error("KPI not found");
  const existing = rowToKPI(rows[rowIndex]);
  const u = { ...existing, ...data };
  await updateRow(accessToken, "KPIs", rowIndex + 2, [
    u.id, u.weekStart, String(u.bni11s), String(u.presenciales),
    String(u.instaPosts), String(u.mailings), String(u.whatsappMsgs),
    String(u.cotizaciones), String(u.cierres), u.createdAt,
  ]);
}

// ─── Marketing Metrics ─────────────────────────────────────────────────────

function rowToMktMetrics(row: string[]): MktMetrics {
  return {
    id: row[0], month: row[1],
    webSessions: Number(row[2]) || 0, webInquiries: Number(row[3]) || 0,
    rrssFollowers: Number(row[4]) || 0, rrssReach: Number(row[5]) || 0,
    rrssEngagements: Number(row[6]) || 0, wspConversations: Number(row[7]) || 0,
    wspNewContacts: Number(row[8]) || 0, emailSent: Number(row[9]) || 0,
    emailOpens: Number(row[10]) || 0, emailClicks: Number(row[11]) || 0,
    otrosNotes: row[12] || "", createdAt: row[13] || "",
  };
}

export async function getMktMetrics(accessToken: string): Promise<MktMetrics[]> {
  try {
    const rows = await readSheet(accessToken, "MktMetrics!A2:N");
    return rows.filter((r) => r[0]).map(rowToMktMetrics);
  } catch {
    return [];
  }
}

export async function upsertMktMetrics(
  accessToken: string,
  data: Omit<MktMetrics, "id" | "createdAt">
): Promise<MktMetrics> {
  const rows = await readSheet(accessToken, "MktMetrics!A2:N");
  const rowIndex = rows.findIndex((r) => r[1] === data.month);
  const now = new Date().toISOString();
  const toRow = (id: string, createdAt: string) => [
    id, data.month, String(data.webSessions), String(data.webInquiries),
    String(data.rrssFollowers), String(data.rrssReach), String(data.rrssEngagements),
    String(data.wspConversations), String(data.wspNewContacts), String(data.emailSent),
    String(data.emailOpens), String(data.emailClicks), data.otrosNotes, createdAt,
  ];
  if (rowIndex === -1) {
    const id = generateId();
    await appendRow(accessToken, "MktMetrics", toRow(id, now));
    return { ...data, id, createdAt: now };
  }
  const existing = rowToMktMetrics(rows[rowIndex]);
  await updateRow(accessToken, "MktMetrics", rowIndex + 2, toRow(existing.id, existing.createdAt));
  return { ...data, id: existing.id, createdAt: existing.createdAt };
}

// ─── Bank Transactions ─────────────────────────────────────────────────────

function rowToBankTx(row: string[]): BankTransaction {
  return {
    id: row[0],
    date: row[1] || "",
    description: row[2] || "",
    docNumber: row[3] || "",
    debit: parseFloat(row[4]) || 0,
    credit: parseFloat(row[5]) || 0,
    balance: parseFloat(row[6]) || 0,
    matchedId: row[7] || "",
    matchedType: (row[8] as BankTransaction["matchedType"]) || "",
    matchedLabel: row[9] || "",
    status: (row[10] as BankTxStatus) || "pendiente",
    importedAt: row[11] || "",
  };
}

export async function getBankTransactions(accessToken: string): Promise<BankTransaction[]> {
  try {
    const rows = await readSheet(accessToken, "BankTx!A2:L");
    return rows.filter((r) => r[0]).map(rowToBankTx);
  } catch {
    return [];
  }
}

export async function importBankTransactions(
  accessToken: string,
  txs: Pick<BankTransaction, "date" | "description" | "docNumber" | "debit" | "credit" | "balance">[]
): Promise<number> {
  if (txs.length === 0) return 0;
  const sheets = getSheets(accessToken);
  const now = new Date().toISOString();
  const values = txs.map((tx) => [
    generateId(), tx.date, tx.description, tx.docNumber,
    String(tx.debit), String(tx.credit), String(tx.balance),
    "", "", "", "pendiente", now,
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "BankTx!A1",
    valueInputOption: "RAW",
    requestBody: { values },
  });
  invalidateSheet("BankTx");
  return values.length;
}

export async function updateBankTransaction(
  accessToken: string,
  id: string,
  data: Partial<Pick<BankTransaction, "status" | "matchedId" | "matchedType" | "matchedLabel">>
): Promise<void> {
  const rows = await readSheet(accessToken, "BankTx!A2:L");
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error("BankTransaction not found");
  const tx = rowToBankTx(rows[rowIndex]);
  const u = { ...tx, ...data };
  await updateRow(accessToken, "BankTx", rowIndex + 2, [
    u.id, u.date, u.description, u.docNumber,
    String(u.debit), String(u.credit), String(u.balance),
    u.matchedId, u.matchedType, u.matchedLabel, u.status, u.importedAt,
  ]);
}

export async function deleteBankTransaction(accessToken: string, id: string): Promise<void> {
  const sheets = getSheets(accessToken);
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === "BankTx");
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) throw new Error("BankTx sheet not found");
  const rows = await readSheet(accessToken, "BankTx!A2:L");
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error("BankTransaction not found");
  await deleteRow(accessToken, sheetId, rowIndex + 2, "BankTx");
}

// ─── Spreadsheet Init ──────────────────────────────────────────────────────

export async function initSpreadsheet(accessToken: string): Promise<void> {
  const sheets = getSheets(accessToken);
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = spreadsheet.data.sheets?.map((s) => s.properties?.title) ?? [];

  const requiredSheets = [
    { title: "Contacts", headers: ["id","name","email","phone","company","role","tags","status","source","notes","createdAt","updatedAt"] },
    { title: "Activities", headers: ["id","contactId","contactName","type","notes","date","status","nextFollowUp","createdAt"] },
    { title: "Vouchers", headers: ["id","contactId","contactName","fileName","driveFileId","driveUrl","amount","currency","date","description","createdAt","checkIn","checkOut","calendarEventId"] },
    { title: "Campaigns", headers: ["id","name","subject","body","status","sentAt","recipientCount","openRate","createdAt"] },
    { title: "Templates", headers: ["id","name","subject","body","tags","createdAt"] },
    { title: "Deals", headers: ["id","contactId","contactName","dealName","amount","currency","stage","probability","closeDate","notes","createdAt","updatedAt"] },
    { title: "Sales", headers: ["id","travelDate","product","detail","checkIn","checkOut","status","paymentStatus","amount","currency","clientName","clientEmail","clientPhone","partner","commission","notes","createdAt"] },
    { title: "Expenses", headers: ["id","month","category","description","amount","createdAt"] },
    { title: "KPIs", headers: ["id","weekStart","bni11s","presenciales","instaPosts","mailings","whatsappMsgs","cotizaciones","cierres","createdAt"] },
    { title: "MktMetrics", headers: ["id","month","webSessions","webInquiries","rrssFollowers","rrssReach","rrssEngagements","wspConversations","wspNewContacts","emailSent","emailOpens","emailClicks","otrosNotes","createdAt"] },
    { title: "BankTx", headers: ["id","date","description","docNumber","debit","credit","balance","matchedId","matchedType","matchedLabel","status","importedAt"] },
  ];

  const addRequests = requiredSheets
    .filter((s) => !existingSheets.includes(s.title))
    .map((s) => ({ addSheet: { properties: { title: s.title } } }));

  if (addRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: addRequests },
    });
  }

  for (const { title, headers } of requiredSheets) {
    const existing = await readSheet(accessToken, `${title}!A1:Z1`);
    if (!existing.length || !existing[0].length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${title}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  }
}
