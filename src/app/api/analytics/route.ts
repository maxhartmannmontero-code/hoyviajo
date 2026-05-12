import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getGA4MonthlyData } from "@/lib/google-analytics";

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    return NextResponse.json({ error: "not_configured" });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") || "2025-04-01";
  const end = searchParams.get("end") || new Date().toISOString().slice(0, 10);

  try {
    const data = await getGA4MonthlyData(token, start, end);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
