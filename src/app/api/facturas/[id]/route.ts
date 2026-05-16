import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { deleteInvoice as deleteInvoiceSheet } from "@/lib/google-sheets";
import { deleteVoucher as deleteFile } from "@/lib/google-drive";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { driveFileId } = await deleteInvoiceSheet(token, id);
  if (driveFileId) await deleteFile(token, driveFileId).catch(() => null);

  return NextResponse.json({ ok: true });
}
