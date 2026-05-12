import { google } from "googleapis";
import { Voucher } from "@/types";

function getCalendar(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createVoucherCalendarEvent(
  accessToken: string,
  voucher: Voucher
): Promise<string> {
  const calendar = getCalendar(accessToken);

  const startDate = voucher.checkIn || voucher.date;
  const endDateInclusive = voucher.checkOut || startDate;
  // All-day event: end date is exclusive in Google Calendar
  const endDate = addDays(endDateInclusive, 1);

  const descLines = [
    `👤 Cliente: ${voucher.contactName}`,
    voucher.description ? `📝 ${voucher.description}` : "",
    voucher.checkIn ? `📅 Check-in: ${voucher.checkIn}` : "",
    voucher.checkOut ? `📅 Check-out: ${voucher.checkOut}` : "",
    voucher.amount > 0 ? `💰 Monto: ${voucher.amount} ${voucher.currency}` : "",
    voucher.driveUrl ? `📎 Voucher: ${voucher.driveUrl}` : "",
    "",
    "— Creado desde CRM Hoy Viajo",
  ].filter(Boolean).join("\n");

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `✈️ ${voucher.contactName} — ${voucher.description || "Viaje"}`,
      description: descLines,
      start: { date: startDate },
      end: { date: endDate },
      colorId: "9",
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 7 * 24 * 60 },
          { method: "popup", minutes: 7 * 24 * 60 },
          { method: "popup", minutes: 24 * 60 },
        ],
      },
    },
  });

  return res.data.id ?? "";
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const calendar = getCalendar(accessToken);
  await calendar.events.delete({ calendarId: "primary", eventId });
}
