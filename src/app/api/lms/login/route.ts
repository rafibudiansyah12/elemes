import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { cookies } from "next/headers";
import { createRelaySession, fetchLms, getRelaySession, type RelaySession, pruneRelaySessions } from "@/scraper/relay-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SESSION_COOKIE = "ruangkelas-lms-session";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

async function getOrCreateSession() {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  const existing = getRelaySession(id);
  return existing && id ? { id, session: existing, created: false } : { ...createRelaySession(), created: true };
}

async function loadLoginForm(session: RelaySession) {
  const page = await fetchLms(session, "/login_new", { method: "GET" });
  if (!page.ok) throw new Error(`LMS login page status ${page.status}`);
  const html = await page.text();
  const $ = cheerio.load(html);
  const form = $("form").first();
  const actionRaw = form.attr("action");
  const username = form.find('input[name="username"]').attr("name");
  const password = form.find('input[type="password"]').attr("name");
  const captcha = form.find('input[name="kapca"]').attr("name");
  const imageRaw = form.find('img[src*="kapca"]').attr("src");
  if (!form.length || !actionRaw || !username || !password || !captcha || !imageRaw) {
    throw new Error("Struktur form login LMS berubah; discovery HTML terbaru diperlukan.");
  }
  const hidden: Record<string, string> = {};
  form.find('input[type="hidden"]').each((_, element) => {
    const name = $(element).attr("name");
    if (name) hidden[name] = $(element).attr("value") ?? "";
  });
  const action = new URL(actionRaw, page.url).toString();
  const imageUrl = new URL(imageRaw, page.url).toString();
  const image = await fetchLms(session, imageUrl, { method: "GET" });
  if (!image.ok || !image.headers.get("content-type")?.startsWith("image/")) throw new Error("Gambar CAPTCHA dari LMS tidak berhasil dimuat.");
  const bytes = Buffer.from(await image.arrayBuffer());
  if (bytes.length > 1_000_000) throw new Error("Gambar CAPTCHA melewati batas ukuran.");
  session.loginForm = { action, hidden, username, password, captcha, image: `data:${image.headers.get("content-type")};base64,${bytes.toString("base64")}` };
  return session.loginForm;
}

export async function GET(request: Request) {
  await pruneRelaySessions();
  const { id, session, created } = await getOrCreateSession();
  try {
    if (session.authenticated) return NextResponse.json({ authenticated: true, dataReady: Boolean(session.data) }, { headers: { "Cache-Control": "no-store" } });
    const form = await loadLoginForm(session);
    const response = NextResponse.json({ authenticated: session.authenticated, captcha: form.image });
    if (created) response.cookies.set(SESSION_COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 6 * 60 * 60 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Struktur form")
      ? "Form login LMS berubah; login dashboard sementara tidak tersedia."
      : "Tidak dapat memuat login LMS atau CAPTCHA. Coba muat ulang.";
    const response = NextResponse.json({ error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
    if (created) response.cookies.set(SESSION_COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 6 * 60 * 60 });
    return response;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = getRelaySession(id);
  if (!session || session.authenticated) return NextResponse.json({ error: "Sesi login tidak tersedia. Muat ulang halaman." }, { status: 409 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Form login tidak valid." }, { status: 400 });
    const values = body as Record<string, unknown>;
    const username = typeof values.username === "string" ? values.username.trim() : "";
    const password = typeof values.password === "string" ? values.password : "";
    const captchaAnswer = typeof values.captcha === "string" ? values.captcha.trim() : "";
    if (!username || !password || !captchaAnswer || username.length > 160 || password.length > 512 || captchaAnswer.length > 32) {
      return NextResponse.json({ error: "Isi username, password, dan CAPTCHA." }, { status: 400 });
    }
    const form = session.loginForm;
    if (!form) return NextResponse.json({ error: "Muat CAPTCHA baru lalu coba lagi." }, { status: 409 });
    const payload = new URLSearchParams(form.hidden);
    payload.set(form.username, username);
    payload.set(form.password, password);
    payload.set(form.captcha, captchaAnswer);
    const result = await fetchLms(session, form.action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: "https://lms.unindra.ac.id/login_new" },
      body: payload,
    });
    const finalPath = new URL(result.url).pathname.toLowerCase();
    if (!result.ok || finalPath.includes("login")) {
      await loadLoginForm(session);
      return NextResponse.json({ error: "LMS belum menerima login. Periksa username, password, dan CAPTCHA, lalu coba lagi." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    session.authenticated = true;
    session.loginForm = undefined;
    return NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Login LMS gagal diproses. Muat CAPTCHA baru lalu coba lagi." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
