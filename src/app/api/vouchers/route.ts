import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getVouchers, createVoucher } from "@/lib/google-sheets";
import { uploadVoucher } from "@/lib/google-drive";

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId") ?? undefined;
  const vouchers = await getVouchers(token, contactId);
  return NextResponse.json(vouchers);
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const contactId = formData.get("contactId") as string;
  const contactName = formData.get("contactName") as string;
  const amount = parseFloat(formData.get("amount") as string) || 0;
  const currency = (formData.get("currency") as string) || "USD";
  const date = formData.get("date") as string;
  const description = formData.get("description") as string;
  const checkIn = (formData.get("checkIn") as string) || "";
  const checkOut = (formData.get("checkOut") as string) || "";

  const buffer = Buffer.from(await file.arrayBuffer());
  const { fileId, webViewLink } = await uploadVoucher(token, file.name, file.type, buffer, contactName);

  const voucher = await createVoucher(token, {
    contactId, contactName, fileName: file.name,
    driveFileId: fileId, driveUrl: webViewLink,
    amount, currency, date, description, checkIn, checkOut, calendarEventId: "",
  });

  return NextResponse.json(voucher, { status: 201 });
}
