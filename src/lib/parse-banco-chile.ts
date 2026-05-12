export interface ParsedTx {
  date: string;
  description: string;
  docNumber: string;
  debit: number;
  credit: number;
  balance: number;
}

function parseClpNumber(s: string): number {
  if (!s || !s.trim() || s.trim() === "-") return 0;
  // Remove $, spaces, then strip thousands separators (periods), replace comma decimal
  const clean = s.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function parseChileanDate(s: string): string {
  const m = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function normalize(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_MAP: Record<string, string> = {
  fecha: "date",
  descripcion: "description",
  glosa: "description",
  detalle: "description",
  ndocumento: "docNumber",
  ndoc: "docNumber",
  numerodocumento: "docNumber",
  documento: "docNumber",
  folio: "docNumber",
  cargo: "debit",
  debito: "debit",
  abono: "credit",
  credito: "credit",
  saldo: "balance",
};

export function parseBancoChileCSV(raw: string): ParsedTx[] {
  const sep = raw.includes(";") ? ";" : ",";
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Find the header row — must contain "fecha" and at least one of cargo/abono/saldo
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    if (low.includes("fecha") && (low.includes("cargo") || low.includes("abono") || low.includes("saldo"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(sep).map((h) => normalize(h.replace(/"/g, "")));
  const colOf: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = HEADER_MAP[h];
    if (key && !(key in colOf)) colOf[key] = i;
  });

  const results: ParsedTx[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
    const rawDate = cols[colOf.date ?? 0] ?? "";
    if (!rawDate) continue;
    const date = parseChileanDate(rawDate);
    if (!date) continue;

    results.push({
      date,
      description: cols[colOf.description ?? 1] ?? "",
      docNumber: colOf.docNumber != null ? (cols[colOf.docNumber] ?? "") : "",
      debit:   colOf.debit   != null ? parseClpNumber(cols[colOf.debit])   : 0,
      credit:  colOf.credit  != null ? parseClpNumber(cols[colOf.credit])  : 0,
      balance: colOf.balance != null ? parseClpNumber(cols[colOf.balance]) : 0,
    });
  }

  return results;
}
