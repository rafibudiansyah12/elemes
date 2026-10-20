import { NextResponse } from "next/server";

// Pratinjau hanya membuka data contoh publik, tanpa akses ke sesi LMS.
export async function POST() {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ error: "Pratinjau publik hanya tersedia di deployment production." }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("ruangkelas-preview", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
