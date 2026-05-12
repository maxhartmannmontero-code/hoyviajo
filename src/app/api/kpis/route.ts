import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getKPIs, createKPI, initSpreadsheet } from "@/lib/google-sheets";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kpis = await getKPIs(token);
  return NextResponse.json(kpis);
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initSpreadsheet(token);
  const body = await req.json();
  const kpi = await createKPI(token, body);
  return NextResponse.json(kpi);
}
