import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.META_APP_ID || "285485288214120";
  const redirectUri = encodeURIComponent("https://hoyviajo.vercel.app/api/instagram/callback");
  const scope = "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement";
  const url = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  return NextResponse.redirect(url);
}
