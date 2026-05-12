import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getExpenses, createExpense, initSpreadsheet } from "@/lib/google-sheets";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const expenses = await getExpenses(token);
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initSpreadsheet(token);
  const body = await req.json();
  const expense = await createExpense(token, body);
  return NextResponse.json(expense);
}
