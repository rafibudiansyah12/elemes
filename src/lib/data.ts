import type { Jadwal, Matkul, Pertemuan, Presensi, Profil, Tugas } from "@/types/lms";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { getCurrentRelayData, getCurrentRelaySession } from "@/scraper/relay-session";

// Cache LMS hanya dibaca saat lokal dan harus cocok dengan sesi yang tersimpan.
const usePrivateLiveData = process.env.NODE_ENV !== "production";

export async function getLocalLmsStatus(): Promise<{ authenticated: boolean; dataReady: boolean }> {
  if (!usePrivateLiveData) return { authenticated: false, dataReady: false };
  try {
    const auth = await readFile(path.join(process.cwd(), "auth.json"));
    const marker = JSON.parse(await readFile(path.join(process.cwd(), "data", "live", "scrapedAt.json"), "utf8")) as { sessionFingerprint?: unknown };
    const fingerprint = createHash("sha256").update(auth).digest("hex");
    return { authenticated: true, dataReady: marker.sessionFingerprint === fingerprint };
  } catch {
    try {
      await readFile(path.join(process.cwd(), "auth.json"));
      return { authenticated: true, dataReady: false };
    } catch {
      return { authenticated: false, dataReady: false };
    }
  }
}

async function currentLiveFingerprint(): Promise<string | null> {
  const status = await getLocalLmsStatus();
  if (!status.authenticated || !status.dataReady) return null;
  try {
    const auth = await readFile(path.join(process.cwd(), "auth.json"));
    return createHash("sha256").update(auth).digest("hex");
  } catch { return null; }
}

// Data hanya berasal dari sesi LMS aktif atau cache lokal yang cocok dengan sesi.
async function readLiveArray<T>(file: string): Promise<T[] | null> {
  if (!await currentLiveFingerprint()) return null;
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(process.cwd(), "data", "live", file), "utf8"));
    return Array.isArray(parsed) ? parsed as T[] : null;
  } catch {
    return null;
  }
}
export async function hasLiveMatkul(): Promise<boolean> { return Boolean(await onlineData()) || (await readLiveArray<Matkul>("matkul.json")) !== null; }
export async function isTugasLive(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") {
    const session = await getCurrentRelaySession();
    return Boolean(session?.data && session.syncState === "complete");
  }
  return (await readLiveArray<Tugas>("tugas.json")) !== null;
}
async function onlineData() {
  if (process.env.NODE_ENV !== "production") return null;
  try { return await getCurrentRelayData(); }
  catch { return null; } // Halaman build statis tidak memiliki request cookie.
}
export async function getMatkul(): Promise<Matkul[]> { return (await onlineData())?.matkul ?? (await readLiveArray<Matkul>("matkul.json")) ?? []; }
export async function getTugas(): Promise<Tugas[]> { return (await onlineData())?.tugas ?? (await readLiveArray<Tugas>("tugas.json")) ?? []; }
export async function getJadwal(): Promise<Jadwal[]> { return (await onlineData())?.jadwal ?? (await readLiveArray<Jadwal>("jadwal.json")) ?? []; }
export async function getPertemuan(): Promise<Pertemuan[]> { return (await onlineData())?.pertemuan ?? (await readLiveArray<Pertemuan>("pertemuan.json")) ?? []; }
export async function getPresensi(): Promise<Presensi[]> { return (await onlineData())?.presensi ?? (await readLiveArray<Presensi>("presensi.json")) ?? []; }
async function readLiveProfile(): Promise<{ nama: string; scrapedAt: string; sessionFingerprint: string } | null> {
  const fingerprint = await currentLiveFingerprint();
  if (!fingerprint) return null;
  try {
    const profile = JSON.parse(await readFile(path.join(process.cwd(), "data", "live", "profil.json"), "utf8")) as { nama: string; scrapedAt: string; sessionFingerprint: string };
    return profile.sessionFingerprint === fingerprint ? profile : null;
  } catch {
    return null;
  }
}
export async function getProfil(): Promise<Profil> {
  const remote = await onlineData();
  if (remote) return remote.profil;
  const live = await readLiveProfile();
  return live?.nama ? { nama: live.nama, nim: "", prodi: "", semester: 0 } : { nama: "Mahasiswa", nim: "", prodi: "", semester: 0 };
}
export async function isProfilLive(): Promise<boolean> { return Boolean(await onlineData()) || Boolean(await readLiveProfile()); }
export async function getDataUpdatedAt(): Promise<string | null> {
  const online = await onlineData();
  if (online) return online.scrapedAt;
  if (!await currentLiveFingerprint()) return null;
  try {
    const marker = JSON.parse(await readFile(path.join(process.cwd(), "data", "live", "scrapedAt.json"), "utf8")) as { scrapedAt?: unknown };
    return typeof marker.scrapedAt === "string" ? marker.scrapedAt : null;
  } catch { return null; }
}
export async function getMatkulById(id: string): Promise<Matkul | undefined> { return (await getMatkul()).find((item) => item.id === id); }
