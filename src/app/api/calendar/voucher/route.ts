import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getVouchers, setVoucherCalendarEvent } from "@/lib/google-sheets";
import { createVoucherCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { voucherId } = await req.json();
  const vouchers = await getVouchers(token);
  const voucher = vouchers.find((v) => v.id === voucherId);
  if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

  // If already has an event, delete it first
  if (voucher.calendarEventId) {
    try { await deleteCalendarEvent(token, voucher.calendarEventId); } catch { /* already deleted */ }
  }

  const eventId = await createVoucherCalendarEvent(token, voucher);
  await setVoucherCalendarEvent(token, voucherId, eventId);

  return NextResponse.json({ eventId });
}
