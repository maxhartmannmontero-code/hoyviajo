import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { deleteVoucher as deleteVoucherSheet } from "@/lib/google-sheets";
import { deleteVoucher as deleteVoucherDrive } from "@/lib/google-drive";
import { deleteCalendarEvent } from "@/lib/google-calendar";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { driveFileId, calendarEventId } = await deleteVoucherSheet(token, id);

  await Promise.allSettled([
    driveFileId ? deleteVoucherDrive(token, driveFileId) : Promise.resolve(),
    calendarEventId ? deleteCalendarEvent(token, calendarEventId) : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true });
}
