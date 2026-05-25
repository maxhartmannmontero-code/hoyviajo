import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getBankTransactions, importBankTransactions, initSpreadsheet, getSales, getExpenses } from "@/lib/google-sheets";
import { parseBancoChileCSV } from "@/lib/parse-banco-chile";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [transactions, sales, expenses] = await Promise.all([
    getBankTransactions(token),
    getSales(token),
    getExpenses(token),
  ]);

  return NextResponse.json({ transactions, sales, expenses });
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { csv?: string; manual?: { date: string; description: string; debit: number; credit: number } };

  // Manual single-transaction entry
  if (body.manual) {
    const { date, description, debit, credit } = body.manual;
    if (!date || !description) return NextResponse.json({ error: "date and description required" }, { status: 400 });
    await initSpreadsheet(token);
    const imported = await importBankTransactions(token, [{ date, description, docNumber: "", debit, credit, balance: 0 }]);
    return NextResponse.json({ imported, skipped: 0, total: 1 });
  }

  const { csv } = body;
  if (!csv) return NextResponse.json({ error: "csv required" }, { status: 400 });

  const parsed = parseBancoChileCSV(csv);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "No se pudo parsear el CSV. Verifica el formato de Banco de Chile." }, { status: 422 });
  }

  // Dedup against existing transactions: skip same (date + debit + credit + first 40 chars of description)
  const existing = await getBankTransactions(token);
  const existingKeys = new Set(
    existing.map((t) => `${t.date}|${t.debit}|${t.credit}|${t.description.slice(0, 40)}`)
  );
  const newTxs = parsed.filter(
    (tx) => !existingKeys.has(`${tx.date}|${tx.debit}|${tx.credit}|${tx.description.slice(0, 40)}`)
  );

  await initSpreadsheet(token);
  const imported = await importBankTransactions(token, newTxs);

  return NextResponse.json({ imported, skipped: parsed.length - imported, total: parsed.length });
}
