import { mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";
import type { Jadwal, Matkul, Presensi, Pertemuan, Tugas } from "@/types/lms";
import { cacheLmsProfile } from "./profile-cache";
import { getSessionFingerprint } from "./session";
import { parsePresensi } from "./parsers/presensi";
import { parseAssignmentLinks, parsePertemuan, type AssignmentLink } from "./parsers/pertemuan";
import { parseTugas } from "./parsers/tugas";

const origin = "https://lms.unindra.ac.id";
const loginMessage = "Sesi habis, jalankan: npm run login";
const meetingUrlsFile = path.resolve("data/raw/_meeting-urls.json");
const suggestedUrlsFile = path.resolve("scripts/urls.suggested.json");

type UrlEntry = { name: string; url: string };
type ScrapeContext = { page: Page; lastRequestAt: number; sessionFingerprint: string };
type ScrapeStatus = { state: "running" | "complete" | "error"; message: string; current?: number; total?: number; updatedAt: string };

const liveDir = path.resolve("data/live");
const lockPath = path.join(liveDir, ".scrape.lock");
const statusPath = path.join(liveDir, "scrape-status.json");

async function setScrapeStatus(status: Omit<ScrapeStatus, "updatedAt">) {
  await mkdir(liveDir, { recursive: true });
  await writeFile(statusPath, JSON.stringify({ ...status, updatedAt: new Date().toISOString() }), "utf8");
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Sesi habis")) return loginMessage;
  if (message.includes("Sesi berubah")) return "Sesi berubah saat sinkronisasi; hasil lama dibuang.";
  if (/timeout|timed out/i.test(message)) return "Waktu tunggu halaman LMS habis. Coba sinkronkan lagi.";
  if (message.includes("Daftar halaman pertemuan belum ditemukan")) return "Daftar halaman belum ditemukan. Jalankan npm run dump -- --crawl-nav.";
  if (message.includes("Tidak ada URL pertemuan LMS")) return "Link halaman LMS belum ditemukan. Jalankan npm run dump -- --crawl-nav.";
  if (message.includes("Sesi lokal tidak ditemukan")) return "Sesi lokal tidak ditemukan. Jalankan npm run login.";
  return "Sinkronisasi gagal. Jalankan npm run scrape di terminal untuk melihat error teknis.";
}

async function acquireScrapeLock() {
  await mkdir(liveDir, { recursive: true });
  for (let attempt = 0; attempt < 900; attempt++) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(String(process.pid));
      return handle;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      // Singkirkan lock tertinggal bila proses pemiliknya sudah mati.
      try {
        const pid = Number(await readFile(lockPath, "utf8"));
        if (!Number.isInteger(pid) || pid <= 0) throw new Error("invalid lock");
        process.kill(pid, 0);
      } catch (lockError) {
        if ((lockError as NodeJS.ErrnoException).code === "ESRCH" || (lockError as Error).message === "invalid lock") {
          await unlink(lockPath).catch(() => undefined);
          continue;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error("Sinkronisasi lain masih berjalan terlalu lama. Tutup proses scrape lama lalu coba lagi.");
}

async function readMeetingUrls(): Promise<UrlEntry[]> {
  let content: string | undefined;
  try { content = await readFile(meetingUrlsFile, "utf8"); }
  catch {
    try { content = await readFile(suggestedUrlsFile, "utf8"); }
    catch { throw new Error("Daftar halaman pertemuan belum ditemukan. Jalankan npm run dump -- --crawl-nav dahulu."); }
  }
  const parsed: unknown = JSON.parse(content);
  if (!Array.isArray(parsed)) throw new Error("Daftar URL pertemuan tidak valid.");
  const unique = new Map<string, UrlEntry>();
  for (const item of parsed) {
    if (!item || typeof item.url !== "string") continue;
    const url = new URL(item.url);
    if (url.origin !== origin || !url.pathname.includes("/pertemuan/pke/")) continue;
    unique.set(url.toString(), { name: typeof item.name === "string" ? item.name : "pertemuan", url: url.toString() });
  }
  if (!unique.size) throw new Error("Tidak ada URL pertemuan LMS di daftar discovery. Jalankan npm run dump -- --crawl-nav.");
  return [...unique.values()];
}

async function fetchHtml(state: ScrapeContext, url: string): Promise<string> {
  const fingerprint = await getSessionFingerprint().catch(() => "");
  if (fingerprint !== state.sessionFingerprint) throw new Error("Sesi berubah selama sinkronisasi.");
  const wait = Math.max(0, 1_000 - (Date.now() - state.lastRequestAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  state.lastRequestAt = Date.now();
  const response = await state.page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  if (state.page.url().toLowerCase().includes("login")) throw new Error(loginMessage);
  if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? "tanpa respons"}`);
  return state.page.content();
}

function isSessionError(error: unknown) { return error instanceof Error && [loginMessage, "Sesi berubah selama sinkronisasi."].includes(error.message); }

async function writeJson<T>(directory: string, filename: string, value: T) {
  await writeFile(path.join(directory, filename), JSON.stringify(value, null, 2), "utf8");
}

async function main() {
  const sessionFingerprint = await getSessionFingerprint().catch(() => {
    throw new Error("Sesi lokal tidak ditemukan. Jalankan: npm run login");
  });
  await setScrapeStatus({ state: "running", message: "Membuka sesi dan membaca ringkasan akademik" });
  const meetingUrls = await readMeetingUrls();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: "auth.json" });
    // Batasi semua navigasi dan resource yang dipicu halaman ke metode baca saja.
    await context.route("**/*", (route) => ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort());
    await cacheLmsProfile(context, sessionFingerprint);

    const page = await context.newPage();
    const state: ScrapeContext = { page, lastRequestAt: Date.now(), sessionFingerprint };
    const attendanceHtml = await fetchHtml(state, `${origin}/presensi`);
    const { matkul, jadwal, presensi } = parsePresensi(attendanceHtml);
    await setScrapeStatus({ state: "running", message: "Ringkasan akademik dibaca; mengambil materi dan tugas", current: 0, total: meetingUrls.length });
    const meetings: Pertemuan[] = [];
    const assignments = new Map<string, AssignmentLink>();
    let failedMeetings = 0;

    for (let index = 0; index < meetingUrls.length; index++) {
      const entry = meetingUrls[index];
      await setScrapeStatus({ state: "running", message: "Membaca halaman pertemuan", current: index + 1, total: meetingUrls.length });
      console.log(`Membaca pertemuan ${index + 1}/${meetingUrls.length}...`);
      try {
        const html = await fetchHtml(state, entry.url);
        const meeting = parsePertemuan(html, matkul);
        if (!meeting) {
          failedMeetings++;
          console.warn(`Pertemuan ${index + 1}: format judul atau mata kuliah tidak dikenali; dilewati.`);
          continue;
        }
        meetings.push(meeting);
        for (const assignment of parseAssignmentLinks(html, meeting.matkulId)) {
          assignments.set(`${assignment.matkulId}:${assignment.url}`, assignment);
        }
      } catch (error) {
        if (isSessionError(error)) throw error;
        failedMeetings++;
        console.warn(`Pertemuan ${index + 1} gagal dibaca (${error instanceof Error ? error.message : "error tidak diketahui"}); halaman lain tetap diproses.`);
      }
    }

    const tasks: Tugas[] = [];
    let failedAssignments = 0;
    for (const [index, assignment] of [...assignments.values()].entries()) {
      await setScrapeStatus({ state: "running", message: "Membaca halaman tugas", current: index + 1, total: assignments.size });
      console.log(`Membaca tugas ${index + 1}/${assignments.size}...`);
      try {
        const html = await fetchHtml(state, assignment.url);
        tasks.push(parseTugas(html, assignment));
      } catch (error) {
        if (isSessionError(error)) throw error;
        failedAssignments++;
        console.warn(`Halaman tugas ${index + 1} gagal dibaca (${error instanceof Error ? error.message : "error tidak diketahui"}); tugas lain tetap diproses.`);
      }
    }

    const outputDir = path.resolve("data/live");
    await mkdir(outputDir, { recursive: true });
    const latestFingerprint = await getSessionFingerprint().catch(() => "");
    if (latestFingerprint !== sessionFingerprint) {
      throw new Error("Sesi berubah selama sinkronisasi; hasil lama dibuang. Jalankan npm run scrape lagi.");
    }
    const scrapedAt = new Date().toISOString();
    await writeJson<Matkul[]>(outputDir, "matkul.json", matkul);
    await writeJson<Tugas[]>(outputDir, "tugas.json", tasks);
    await writeJson<Jadwal[]>(outputDir, "jadwal.json", jadwal);
    await writeJson<Presensi[]>(outputDir, "presensi.json", presensi);
    await writeJson<Pertemuan[]>(outputDir, "pertemuan.json", meetings);
    await writeJson(outputDir, "scrapedAt.json", { scrapedAt, sessionFingerprint });
    await setScrapeStatus({ state: "complete", message: "Sinkronisasi selesai", current: 1, total: 1 });

    console.log(`Sinkron selesai: ${matkul.length} mata kuliah, ${jadwal.length} jadwal, ${presensi.length} rekap presensi, ${meetings.length} pertemuan, ${tasks.length} tugas.`);
    if (failedMeetings || failedAssignments) console.warn(`Sebagian halaman gagal: ${failedMeetings} pertemuan, ${failedAssignments} halaman tugas.`);
    console.log("SKS, semester, dan progres materi tidak tersedia pada halaman yang didump; field tersebut dibiarkan kosong.");
  } finally {
    await browser.close();
  }
}

async function run() {
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  try {
    lock = await acquireScrapeLock();
    await main();
  } catch (error) {
    const message = safeErrorMessage(error);
    if (lock) await setScrapeStatus({ state: "error", message });
    console.error(message);
    process.exitCode = 1;
  } finally {
    if (lock) {
      await lock.close();
      await unlink(lockPath).catch(() => undefined);
    }
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Scrape LMS gagal.");
  process.exitCode = 1;
});
