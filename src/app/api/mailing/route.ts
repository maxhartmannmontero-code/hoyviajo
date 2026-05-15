import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getContacts } from "@/lib/google-sheets";
import { getAccessToken } from "@/lib/get-access-token";

const resend = new Resend(process.env.RESEND_API_KEY);

function injectUtm(html: string, campaign: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url) => {
    const sep = url.includes("?") ? "&" : "?";
    return `href="${url}${sep}utm_source=crm&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}"`;
  });
}

export async function POST(req: NextRequest) {
  const { contactIds, subject, body, utmCampaign } = await req.json();

  if (!contactIds?.length || !subject || !body) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const allContacts = await getContacts(token);
  const targets = allContacts.filter((c) => contactIds.includes(c.id) && c.email);

  const results: { name: string; email: string; ok: boolean; error?: string }[] = [];

  for (const contact of targets) {
    const personalizedBody = body
      .replace(/\{\{nombre\}\}/gi, contact.name.split(" ")[0])
      .replace(/\{\{nombre_completo\}\}/gi, contact.name)
      .replace(/\{\{email\}\}/gi, contact.email);

    const htmlBody = injectUtm(
      personalizedBody.replace(/\n/g, "<br>"),
      utmCampaign || "mailing"
    );

    try {
      const { error } = await resend.emails.send({
        from: "Hoy Viajo <contacto@hoyviajo.cl>",
        to: contact.email,
        subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${htmlBody}</div>`,
      });
      if (error) throw new Error(error.message);
      results.push({ name: contact.name, email: contact.email, ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: contact.name, email: contact.email, ok: false, error: msg });
    }
  }

  return NextResponse.json({ results });
}
