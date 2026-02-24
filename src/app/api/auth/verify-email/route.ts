import { NextRequest, NextResponse } from "next/server";
import { verifyEmailChange } from "@/lib/actions/users";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/settings/profile?emailError=Missing+token", request.url),
    );
  }

  try {
    const result = await verifyEmailChange(token);
    return NextResponse.redirect(
      new URL(
        `/settings/profile?emailSuccess=Email+changed+to+${encodeURIComponent(result.newEmail)}`,
        request.url,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification failed";
    return NextResponse.redirect(
      new URL(
        `/settings/profile?emailError=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
