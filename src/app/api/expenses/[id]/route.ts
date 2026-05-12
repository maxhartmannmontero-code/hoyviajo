import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { deleteExpense } from "@/lib/google-sheets";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteExpense(token, id);
  return NextResponse.json({ success: true });
}
