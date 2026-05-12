import { NextResponse } from "next/server";
import { getInstagramInsights } from "@/lib/instagram";

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token || !accountId) {
    return NextResponse.json({ error: "not_configured" });
  }

  try {
    const data = await getInstagramInsights(token, accountId);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
