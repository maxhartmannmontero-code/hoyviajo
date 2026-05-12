import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) return null;

  const secret = process.env.AUTH_SECRET!;

  try {
    const decoded = await decode({
      token: sessionToken,
      secret,
      salt: cookieStore.get("__Secure-authjs.session-token")
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    });
    return (decoded as Record<string, unknown>)?.accessToken as string ?? null;
  } catch {
    return null;
  }
}
