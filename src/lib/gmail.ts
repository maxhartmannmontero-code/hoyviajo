import { google } from "googleapis";

function getGmail(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

function encodeEmail(to: string, subject: string, body: string, from: string): string {
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body).toString("base64"),
  ];
  return Buffer.from(emailLines.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  from: string
): Promise<void> {
  const gmail = getGmail(accessToken);
  const raw = encodeEmail(to, subject, body, from);
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

export async function sendCampaign(
  accessToken: string,
  emails: string[],
  subject: string,
  body: string,
  from: string,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i++) {
    try {
      await sendEmail(accessToken, emails[i], subject, body, from);
      sent++;
    } catch {
      failed++;
    }
    if (onProgress) onProgress(i + 1, emails.length);
    await new Promise((r) => setTimeout(r, 200));
  }

  return { sent, failed };
}
