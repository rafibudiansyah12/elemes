import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { clearLiveCache } from "../../../../../scripts/live-cache";

export const runtime = "nodejs";

function isLocalRequest(request: Request) {
  const host = new URL(request.url).hostname;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).hostname === host && ["localhost", "127.0.0.1", "::1"].includes(host);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Sesi LMS lokal tidak tersedia pada deployment publik." }, { status: 404 });
  }
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: "Aksi hanya tersedia dari aplikasi lokal." }, { status: 403 });
  }

  try {
    await unlink(path.join(process.cwd(), "auth.json"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      return NextResponse.json({ error: "Sesi lokal gagal dihapus." }, { status: 500 });
    }
  }
  try {
    await clearLiveCache();
  } catch {
    return NextResponse.json({ error: "Sesi dihapus, tetapi cache lokal gagal dibersihkan." }, { status: 500 });
  }
  return NextResponse.json({ message: "Sesi lokal sudah dihapus." });
}
