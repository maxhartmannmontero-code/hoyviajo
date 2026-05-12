import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getActivities, createActivity } from "@/lib/google-sheets";

export async function GET(req: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId") ?? undefined;
    const activities = await getActivities(token, contactId);
    return NextResponse.json(activities);
  } catch (e) {
    console.error("[GET /api/activities]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const activity = await createActivity(token, body);
    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    console.error("[POST /api/activities]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
