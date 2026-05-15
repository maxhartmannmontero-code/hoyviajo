import { NextResponse } from "next/server";
import { getInstagramInsights } from "@/lib/instagram";

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "not_configured" });
  }

  // accountId defaults to "me" when using Instagram API user token
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID || "me";

  try {
    const data = await getInstagramInsights(token, accountId);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
