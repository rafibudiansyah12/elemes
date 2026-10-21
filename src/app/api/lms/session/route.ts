import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentRelaySession, removeRelaySession } from "@/scraper/relay-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SESSION_COOKIE = "ruangkelas-lms-session";

export async function GET() {
  const session = await getCurrentRelaySession();
  return NextResponse.json({ authenticated: Boolean(session?.authenticated), dataReady: Boolean(session?.authenticated && session.data), syncState: session?.syncState ?? null, dataRevision: session?.dataRevision ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const cookieStore = await cookies();
  removeRelaySession(cookieStore.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
