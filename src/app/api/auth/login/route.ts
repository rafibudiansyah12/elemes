import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

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
    return NextResponse.json({ error: "Login LMS hanya tersedia pada aplikasi lokal." }, { status: 404 });
  }
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: "Aksi hanya tersedia dari aplikasi lokal." }, { status: 403 });
  }

  const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const child = spawn(process.execPath, [tsxCli, "scripts/login.ts"], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  return NextResponse.json({ message: "Jendela Chromium untuk login sedang dibuka." });
}
