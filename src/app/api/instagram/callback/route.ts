import { NextRequest, NextResponse } from "next/server";

const REDIRECT_URI = "https://hoyviajo.vercel.app/api/instagram/callback";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px">
      <h2>❌ Error al conectar Instagram</h2><p>${error ?? "No se recibió código"}</p>
    </body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  const appId = process.env.META_APP_ID || "285485288214120";
  const appSecret = process.env.META_APP_SECRET!;

  // Exchange code for user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`
  );

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px">
      <h2>❌ Error obteniendo token</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre>
    </body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  const userToken = tokenData.access_token;

  // Get Instagram Business Account ID via the connected Facebook Page
  const pagesRes = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?access_token=${userToken}`
  );
  const pagesData = await pagesRes.json();
  const pages = pagesData.data ?? [];

  let igAccountId = "";
  let pageToken = userToken;

  for (const page of pages) {
    const igRes = await fetch(
      `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );
    const igData = await igRes.json();
    if (igData.instagram_business_account?.id) {
      igAccountId = igData.instagram_business_account.id;
      pageToken = page.access_token;
      break;
    }
  }

  // Exchange for long-lived token (60 days)
  const llRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`
  );
  const llData = await llRes.json();
  const longLivedToken = llData.access_token ?? userToken;
  const expiresIn = llData.expires_in ? Math.floor(llData.expires_in / 86400) : 60;

  return new NextResponse(`
    <html><body style="font-family:sans-serif;padding:40px;background:#f9fafb;max-width:700px;margin:0 auto">
      <h2 style="color:#16a34a">✅ Autenticación exitosa</h2>
      <p>Copia estos valores en <strong>Vercel → Settings → Environment Variables</strong> y luego haz Redeploy:</p>
      <table style="border-collapse:collapse;width:100%;margin:20px 0;background:#fff;border:1px solid #e5e7eb">
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:12px;font-weight:bold;white-space:nowrap">META_ACCESS_TOKEN</td>
          <td style="padding:12px;font-family:monospace;font-size:11px;word-break:break-all;background:#f3f4f6">${longLivedToken}</td>
        </tr>
        ${igAccountId ? `<tr>
          <td style="padding:12px;font-weight:bold;white-space:nowrap">INSTAGRAM_ACCOUNT_ID</td>
          <td style="padding:12px;font-family:monospace;background:#f3f4f6">${igAccountId}</td>
        </tr>` : `<tr>
          <td colspan="2" style="padding:12px;color:#dc2626">⚠️ No se encontró cuenta de Instagram Business vinculada a ningún fanpage. Agrega solo META_ACCESS_TOKEN por ahora.</td>
        </tr>`}
      </table>
      <p style="color:#6b7280;font-size:13px">⏱ El token dura <strong>${expiresIn} días</strong>. Cuando expire, vuelve a <code>/api/instagram/connect</code> para renovarlo.</p>
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });
}
