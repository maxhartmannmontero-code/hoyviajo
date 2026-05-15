import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "No token — no hay sesión" });

  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  if (!propertyId) return NextResponse.json({ error: "GOOGLE_ANALYTICS_PROPERTY_ID no está configurado en Vercel" });

  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "2024-01-01", endDate: today }],
        dimensions: [{ name: "yearMonth" }],
        metrics: [{ name: "sessions" }],
      }),
    }
  );

  const raw = await res.json();

  return NextResponse.json({
    propertyId,
    httpStatus: res.status,
    tokenPresent: !!token,
    tokenPrefix: token.slice(0, 20) + "...",
    ga4Response: raw,
  });
}
