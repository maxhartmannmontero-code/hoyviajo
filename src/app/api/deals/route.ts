import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getDeals, createDeal } from "@/lib/google-sheets";

export async function GET() {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const deals = await getDeals(token);
    return NextResponse.json(deals);
  } catch (e) {
    console.error("[GET /api/deals]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const deal = await createDeal(token, body);
    return NextResponse.json(deal, { status: 201 });
  } catch (e) {
    console.error("[POST /api/deals]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
