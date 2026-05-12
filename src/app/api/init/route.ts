import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { initSpreadsheet } from "@/lib/google-sheets";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initSpreadsheet(token);
  return NextResponse.json({ success: true });
}

export async function POST() {
  return GET();
}
