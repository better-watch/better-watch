import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createGuestUserForAuth } from "@/lib/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get("redirectUrl") || "/chat";

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  const { email, password } = await createGuestUserForAuth();

  const result = await auth.api.signInEmail({
    body: { email, password, callbackURL: redirectUrl },
    headers: request.headers,
  });

  if (result.redirect) {
    return NextResponse.redirect(result.redirect);
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
