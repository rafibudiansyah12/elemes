import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

export async function GET() {
  // Endpoint autentikasi lokal tidak tersedia pada deployment publik.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ authenticated: false }, { status: 404 });
  }
  let authenticated = false;
  let authFingerprint = "";
  try {
    const auth = await readFile(path.join(process.cwd(), "auth.json"));
    authFingerprint = createHash("sha256").update(auth).digest("hex");
    authenticated = true;
  } catch {
    // Sesi lokal belum tersimpan.
  }
  let scrapedAt: string | null = null;
  let sync: { state: string; message: string; current?: number; total?: number } | null = null;
  if (authenticated) {
    try {
      const result = JSON.parse(await readFile(path.join(process.cwd(), "data", "live", "scrapedAt.json"), "utf8")) as { scrapedAt?: unknown; sessionFingerprint?: unknown };
      if (typeof result.scrapedAt === "string" && result.sessionFingerprint === authFingerprint) scrapedAt = result.scrapedAt;
    } catch { /* Cache belum selesai disinkronkan. */ }
    try {
      const result = JSON.parse(await readFile(path.join(process.cwd(), "data", "live", "scrape-status.json"), "utf8")) as Record<string, unknown>;
      if (typeof result.state === "string" && typeof result.message === "string") {
        sync = {
          state: result.state,
          message: result.message,
          ...(typeof result.current === "number" ? { current: result.current } : {}),
          ...(typeof result.total === "number" ? { total: result.total } : {}),
        };
      }
    } catch { /* Belum ada status scraper. */ }
  }
  return NextResponse.json({ authenticated, dataReady: Boolean(scrapedAt), scrapedAt, sync });
}
