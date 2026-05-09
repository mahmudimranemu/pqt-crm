import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Returns the current session user. Used by client components that need the
 *  user/role at render time (e.g. button visibility). 401 when not signed in.
 */
export async function GET() {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(session.user);
}
