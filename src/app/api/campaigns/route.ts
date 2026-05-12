import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getCampaigns, createCampaign, getContacts } from "@/lib/google-sheets";
import { sendCampaign } from "@/lib/gmail";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await getCampaigns(token);
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, subject, htmlBody, recipientIds, status } = body;

  if (status === "enviando" && recipientIds?.length > 0) {
    const contacts = await getContacts(token);
    const emails = contacts.filter((c) => recipientIds.includes(c.id) && c.email).map((c) => c.email);
    const { sent } = await sendCampaign(token, emails, subject, htmlBody, "me");
    const campaign = await createCampaign(token, {
      name, subject, body: htmlBody, status: "enviado",
      sentAt: new Date().toISOString(), recipientCount: sent, openRate: 0,
    });
    return NextResponse.json(campaign, { status: 201 });
  }

  const campaign = await createCampaign(token, {
    name, subject, body: htmlBody ?? body.body ?? "",
    status: status ?? "borrador", sentAt: "", recipientCount: 0, openRate: 0,
  });
  return NextResponse.json(campaign, { status: 201 });
}
