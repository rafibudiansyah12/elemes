import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { cookies } from "next/headers";
import { fetchLms, getRelaySession } from "@/scraper/relay-session";
import { parsePresensi } from "../../../../../scripts/parsers/presensi";
import { parseAssignmentLinks, parsePertemuan } from "../../../../../scripts/parsers/pertemuan";
import { parseTugas } from "../../../../../scripts/parsers/tugas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SESSION_COOKIE = "ruangkelas-lms-session";
const LMS_ORIGIN = "https://lms.unindra.ac.id";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = getRelaySession(id);
  if (!session?.authenticated) return jsonError("Sesi LMS tidak aktif. Login kembali.", 401);
  if (session.data) return NextResponse.json({ ...session.data, cached: true }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ dataReady: false }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Permintaan tidak valid.", 403);
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = getRelaySession(id);
  if (!session?.authenticated) return jsonError("Sesi LMS tidak aktif. Login kembali.", 401);
  // Hindari memulai ulang sinkronisasi jika request pertama masih berjalan.
  if (session.syncState === "running" && session.data) return NextResponse.json(session.data, { headers: { "Cache-Control": "no-store" } });
  if (session.syncState === "complete" && session.data) return NextResponse.json(session.data, { headers: { "Cache-Control": "no-store" } });
  try {
    const response = await fetchLms(session, "/presensi", { method: "GET" });
    if (!response.ok) throw new Error("Presensi tidak tersedia.");
    const html = await response.text();
    const { matkul, jadwal, presensi } = parsePresensi(html);
    const $ = cheerio.load(html);
    const meetingUrls = new Set<string>();
    $("a[href*='/pertemuan/pke/']").each((_, link) => {
      const href = $(link).attr("href");
      if (!href) return;
      const url = new URL(href, LMS_ORIGIN);
      if (url.origin === LMS_ORIGIN && /^\/pertemuan\/pke\/[A-Za-z0-9+/=]+$/.test(url.pathname)) meetingUrls.add(url.toString());
    });
    const snapshot = {
      matkul,
      tugas: [],
      jadwal,
      presensi,
      pertemuan: [],
      profil: { nama: "Mahasiswa", nim: "", prodi: "", semester: 0 },
      scrapedAt: new Date().toISOString(),
    };
    session.data = snapshot;
    session.syncState = "running";
    // Dasbor cukup menunggu satu halaman inti. Detail materi dan tugas dilengkapi di belakang layar.
    void loadDetails(session, [...meetingUrls]).catch(() => { session.syncState = "error"; });
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Sesi LMS habis")) {
      session.authenticated = false;
      session.data = undefined;
      return jsonError("Sesi LMS habis. Silakan login kembali.", 401);
    }
    const message = error instanceof Error && (error.message.includes("Tabel presensi") || error.message.includes("Kolom presensi") || error.message.includes("baris mata kuliah") || error.message.includes("Link pertemuan"))
      ? error.message
      : "Sinkronisasi LMS gagal. Coba lagi beberapa saat.";
    return jsonError(message, 502);
  }
}

async function loadDetails(session: NonNullable<ReturnType<typeof getRelaySession>>, meetingUrls: string[]) {
  const matkul = session.data?.matkul ?? [];
  const meetings = [];
  const assignments = new Map<string, ReturnType<typeof parseAssignmentLinks>[number]>();
  const warnings: string[] = [];
  for (const url of meetingUrls) {
    try {
      const page = await fetchLms(session, url, { method: "GET" });
      if (!page.ok) { warnings.push("Sebagian halaman materi tidak dapat dibaca."); continue; }
      const html = await page.text();
      const meeting = parsePertemuan(html, matkul);
      if (meeting) meetings.push(meeting);
      if (meeting?.matkulId) for (const item of parseAssignmentLinks(html, meeting.matkulId)) assignments.set(item.url, item);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesi LMS habis")) throw error;
      warnings.push("Sebagian halaman materi tidak dapat dibaca.");
    }
  }
  const tugas = [];
  for (const assignment of assignments.values()) {
    try {
      const page = await fetchLms(session, assignment.url, { method: "GET" });
      if (page.ok) tugas.push(parseTugas(await page.text(), assignment));
      else warnings.push("Sebagian halaman tugas tidak dapat dibaca.");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesi LMS habis")) throw error;
      warnings.push("Sebagian halaman tugas tidak dapat dibaca.");
    }
  }
  let nama = "Mahasiswa";
  try {
    const profilePage = await fetchLms(session, "/member/profil", { method: "GET" });
    if (profilePage.ok) nama = cheerio.load(await profilePage.text())(".profile-username").first().text().replace(/\s+/g, " ").trim() || nama;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Sesi LMS habis")) throw error;
    warnings.push("Profil tidak dapat dibaca.");
  }
  if (!session.authenticated || !session.data) return;
  session.data = { ...session.data, tugas, pertemuan: meetings, profil: { nama, nim: "", prodi: "", semester: 0 }, scrapedAt: new Date().toISOString(), warnings: [...new Set(warnings)] };
  session.syncState = "complete";
}
