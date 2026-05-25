import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { importBankTransactions, initSpreadsheet } from "@/lib/google-sheets";

const MAY_2026: { date: string; description: string; debit: number; credit: number }[] = [
  { date: "2026-05-04", description: "Pago:e-Agencias",                            debit: 18503,   credit: 0 },
  { date: "2026-05-04", description: "Pago:ratehawk.com",                           debit: 93268,   credit: 0 },
  { date: "2026-05-04", description: "Traspaso De:maximiliano",                     debit: 0,       credit: 100000 },
  { date: "2026-05-04", description: "App-Traspaso A:carolina Matthews",            debit: 20000,   credit: 0 },
  { date: "2026-05-04", description: "App-Traspaso A:max Hartmann",                 debit: 25000,   credit: 0 },
  { date: "2026-05-04", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
  { date: "2026-05-04", description: "App-Traspaso A:carolina Matthews",            debit: 52000,   credit: 0 },
  { date: "2026-05-04", description: "Pago:shellbalmaceda288",                      debit: 15000,   credit: 0 },
  { date: "2026-05-04", description: "Pago:mc Donalds",                             debit: 8590,    credit: 0 },
  { date: "2026-05-04", description: "Pago:sodimac La Serena",                      debit: 9081,    credit: 0 },
  { date: "2026-05-05", description: "App-Traspaso A:max Hartmann",                 debit: 20000,   credit: 0 },
  { date: "2026-05-05", description: "App-Traspaso A:pablo Alexis Arellano Pineda", debit: 150000,  credit: 0 },
  { date: "2026-05-05", description: "App-Traspaso A:carolina Matthews",            debit: 69000,   credit: 0 },
  { date: "2026-05-05", description: "Traspaso De:maximiliano",                     debit: 0,       credit: 120000 },
  { date: "2026-05-15", description: "Comision Compras En El Extranjero",           debit: 440,     credit: 0 },
  { date: "2026-05-15", description: "Comision Compras En El Extranjero",           debit: 443,     credit: 0 },
  { date: "2026-05-15", description: "App-Traspaso A:zeus Chile",                   debit: 59500,   credit: 0 },
  { date: "2026-05-15", description: "App-Traspaso A:carolina Matthews",            debit: 225000,  credit: 0 },
  { date: "2026-05-15", description: "Pago:proveedores 0969078309",                 debit: 0,       credit: 1103000 },
  { date: "2026-05-18", description: "App-Traspaso A:carolina Matthews",            debit: 57000,   credit: 0 },
  { date: "2026-05-18", description: "App-Traspaso A:max Hartmann",                 debit: 10000,   credit: 0 },
  { date: "2026-05-18", description: "App-Traspaso A:carolina Matthews",            debit: 50000,   credit: 0 },
  { date: "2026-05-19", description: "App-Traspaso A:carolina Matthews",            debit: 30000,   credit: 0 },
  { date: "2026-05-20", description: "App-Traspaso A:carolina Matthews",            debit: 20000,   credit: 0 },
  { date: "2026-05-22", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
  { date: "2026-05-22", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
  { date: "2026-05-22", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
  { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 25000,   credit: 0 },
  { date: "2026-05-25", description: "App-Traspaso A:max Hartmann",                 debit: 20000,   credit: 0 },
  { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 30000,   credit: 0 },
  { date: "2026-05-25", description: "Pago:claude.ai Subscri",                      debit: 22015,   credit: 0 },
  { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 15000,   credit: 0 },
  { date: "2026-05-25", description: "App-Traspaso A:carolina Matthews",            debit: 50000,   credit: 0 },
];

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await initSpreadsheet(token);
  const txs = MAY_2026.map(({ date, description, debit, credit }) => ({
    date, description, docNumber: "", debit, credit, balance: 0,
  }));
  const imported = await importBankTransactions(token, txs);

  return NextResponse.json({ imported, skipped: txs.length - imported, total: txs.length });
}
