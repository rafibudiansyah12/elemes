import { randomBytes } from "node:crypto";
import makeFetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import type { Jadwal, Matkul, Pertemuan, Presensi, Profil, Tugas } from "@/types/lms";
import { cookies } from "next/headers";

const LMS_ORIGIN = "https://lms.unindra.ac.id";
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SESSIONS = 100;

export type RelayData = {
  matkul: Matkul[];
  tugas: Tugas[];
  jadwal: Jadwal[];
  presensi: Presensi[];
  pertemuan: Pertemuan[];
  profil: Profil;
  scrapedAt: string;
  warnings?: string[];
};
type LoginForm = { action: string; hidden: Record<string, string>; username: string; password: string; captcha: string; image: string };
type CookieFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type RelaySession = {
  fetch: CookieFetch;
  createdAt: number;
  authenticated: boolean;
  loginForm?: LoginForm;
  data?: RelayData;
  syncState?: "running" | "complete" | "error";
  requestQueue: Promise<void>;
  lastRequestCompletedAt: number;
};

const globalStore = globalThis as typeof globalThis & { __ruangKelasLmsSessions?: Map<string, RelaySession> };
const sessions = globalStore.__ruangKelasLmsSessions ??= new Map<string, RelaySession>();
async function acquireLmsRequestSlot(session: RelaySession) {
  const previous = session.requestQueue;
  let releaseQueue!: () => void;
  session.requestQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
  await previous;
  const wait = Math.max(0, 1_000 - (Date.now() - session.lastRequestCompletedAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  return () => { session.lastRequestCompletedAt = Date.now(); releaseQueue(); };
}

export function createRelaySession() {
  for (const [oldId, oldSession] of sessions) {
    if (Date.now() - oldSession.createdAt > SESSION_TTL_MS || sessions.size >= MAX_SESSIONS) sessions.delete(oldId);
  }
  const id = randomBytes(32).toString("base64url");
  const jar = new CookieJar();
  const cookieFetch = makeFetchCookie(fetch, jar) as unknown as CookieFetch;
  const session: RelaySession = { fetch: cookieFetch, createdAt: Date.now(), authenticated: false, requestQueue: Promise.resolve(), lastRequestCompletedAt: 0 };
  sessions.set(id, session);
  return { id, session };
}

export function getRelaySession(id?: string | null): RelaySession | undefined {
  if (!id) return undefined;
  const session = sessions.get(id);
  if (!session) return undefined;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return undefined;
  }
  return session;
}

export async function getCurrentRelaySession() {
  const id = (await cookies()).get("ruangkelas-lms-session")?.value;
  return getRelaySession(id);
}

export async function getCurrentRelayData() {
  const session = await getCurrentRelaySession();
  return session?.authenticated ? session.data ?? null : null;
}

export function removeRelaySession(id?: string | null) {
  if (id) sessions.delete(id);
}

export async function fetchLms(session: RelaySession, pathOrUrl: string, init?: RequestInit) {
  const url = new URL(pathOrUrl, LMS_ORIGIN);
  if (url.origin !== LMS_ORIGIN) throw new Error("Alamat tujuan LMS tidak valid.");
  if (init?.method && !["GET", "POST"].includes(init.method.toUpperCase())) throw new Error("Metode request tidak diizinkan.");
  const release = await acquireLmsRequestSlot(session);
  try {
    const upstream = await session.fetch(url, { ...init, redirect: "follow", signal: AbortSignal.timeout(30_000) });
    const finalUrl = upstream.url;
    const bytes = await upstream.arrayBuffer();
    const headers = new Headers(upstream.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    const response = new Response(bytes, { status: upstream.status, statusText: upstream.statusText, headers });
    Object.defineProperty(response, "url", { value: finalUrl });
    if (finalUrl.toLowerCase().includes("login") && session.authenticated) {
      session.authenticated = false;
      session.data = undefined;
      throw new Error("Sesi LMS habis. Silakan login kembali.");
    }
    return response;
  } finally {
    release();
  }
}

export async function pruneRelaySessions() {
  for (const [id, session] of sessions) if (Date.now() - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
}
