import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getInvoices, createInvoice } from "@/lib/google-sheets";
import { uploadInvoice } from "@/lib/google-drive";
import { InvoiceDirection } from "@/types";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invoices = await getInvoices(token);
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const direction = (formData.get("direction") as InvoiceDirection) || "recibida";
  const month = formData.get("month") as string;
  const number = (formData.get("number") as string) || "";
  const provider = (formData.get("provider") as string) || "";
  const amount = parseFloat(formData.get("amount") as string) || 0;
  const currency = (formData.get("currency") as string) || "CLP";
  const date = (formData.get("date") as string) || "";
  const description = (formData.get("description") as string) || "";
  const notes = (formData.get("notes") as string) || "";
  const exenta = formData.get("exenta") === "true";

  const buffer = Buffer.from(await file.arrayBuffer());
  const { fileId, webViewLink } = await uploadInvoice(token, file.name, file.type, buffer, direction, month);

  const invoice = await createInvoice(token, {
    direction, month, number, provider,
    fileName: file.name, driveFileId: fileId, driveUrl: webViewLink,
    amount, currency, date, description, notes, exenta,
  });

  return NextResponse.json(invoice, { status: 201 });
}
