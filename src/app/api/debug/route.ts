import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll().map((c) => ({ name: c.name, valuePreview: c.value.slice(0, 30) }));
  return NextResponse.json({ cookies: all });
}
