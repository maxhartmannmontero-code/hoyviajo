import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getTemplates, createTemplate } from "@/lib/google-sheets";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await getTemplates(token);
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const template = await createTemplate(token, body);
  return NextResponse.json(template, { status: 201 });
}
