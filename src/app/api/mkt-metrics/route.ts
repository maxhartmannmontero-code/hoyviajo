import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getMktMetrics, upsertMktMetrics, initSpreadsheet } from "@/lib/google-sheets";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const metrics = await getMktMetrics(token);
  return NextResponse.json(metrics);
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initSpreadsheet(token);
  const body = await req.json();
  const result = await upsertMktMetrics(token, body);
  return NextResponse.json(result);
}
