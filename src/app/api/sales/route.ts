import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getSales, createSale } from "@/lib/google-sheets";

export async function GET() {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sales = await getSales(token);
    return NextResponse.json(sales);
  } catch (e) {
    console.error("[GET /api/sales]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const sale = await createSale(token, body);
    return NextResponse.json(sale, { status: 201 });
  } catch (e) {
    console.error("[POST /api/sales]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
