import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { deleteInvoice as deleteInvoiceSheet, updateInvoice, getInvoices } from "@/lib/google-sheets";
import { deleteVoucher as deleteFile, uploadInvoice } from "@/lib/google-drive";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const invoices = await getInvoices(token);
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { fileId, webViewLink } = await uploadInvoice(
    token, file.name, file.type, buffer, inv.direction, inv.month
  );

  await updateInvoice(token, id, { fileName: file.name, driveFileId: fileId, driveUrl: webViewLink });
  return NextResponse.json({ ok: true, driveUrl: webViewLink });
}

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
