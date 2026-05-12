export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!auth|_next/static|_next/image|favicon.ico|api/auth).*)"],
};
