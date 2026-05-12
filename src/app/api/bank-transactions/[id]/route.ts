import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { updateBankTransaction, deleteBankTransaction } from "@/lib/google-sheets";
import type { BankTransaction } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Partial<Pick<BankTransaction, "status" | "matchedId" | "matchedType" | "matchedLabel">>;

  await updateBankTransaction(token, id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteBankTransaction(token, id);
  return NextResponse.json({ ok: true });
}
