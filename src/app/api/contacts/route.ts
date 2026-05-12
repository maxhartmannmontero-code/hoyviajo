import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getContacts, createContact } from "@/lib/google-sheets";

export async function GET() {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const contacts = await getContacts(token);
    return NextResponse.json(contacts);
  } catch (e) {
    console.error("[GET /api/contacts]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const contact = await createContact(token, body);
    return NextResponse.json(contact, { status: 201 });
  } catch (e) {
    console.error("[POST /api/contacts]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
