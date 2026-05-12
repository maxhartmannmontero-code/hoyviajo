import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { updateKPI } from "@/lib/google-sheets";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  await updateKPI(token, id, body);
  return NextResponse.json({ success: true });
}
