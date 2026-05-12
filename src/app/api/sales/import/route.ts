import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { bulkCreateSales, clearSales, initSpreadsheet } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { sales, clearFirst } = await req.json();
    if (!Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    await initSpreadsheet(token);
    if (clearFirst) await clearSales(token);
    const count = await bulkCreateSales(token, sales);
    return NextResponse.json({ count });
  } catch (e) {
    console.error("[POST /api/sales/import]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
