import type { Jadwal, Matkul, Pertemuan, Presensi, Profil, Tugas } from "@/types/lms";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import matkulJson from "../../data/mock/matkul.json";
import tugasJson from "../../data/mock/tugas.json";
import jadwalJson from "../../data/mock/jadwal.json";
import pertemuanJson from "../../data/mock/pertemuan.json";
import profilJson from "../../data/mock/profil.json";

// Cache LMS hanya dibaca saat lokal dan harus cocok dengan sesi yang tersimpan.
const usePrivateLiveData = process.env.NODE_ENV !== "production";
const productionPreview = process.env.NODE_ENV === "production";
const mockMatkul = matkulJson as Matkul[];
const mockTugas = tugasJson as Tugas[];
const mockJadwal = jadwalJson as Jadwal[];
const mockPertemuan = pertemuanJson as Pertemuan[];
const mockProfil = profilJson as Profil;

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

// Data live menang bila tersedia; mock dipakai sebelum sinkronisasi pertama.
async function readLiveArray<T>(file: string): Promise<T[] | null> {
  if (!await currentLiveFingerprint()) return null;
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(process.cwd(), "data", "live", file), "utf8"));
    return Array.isArray(parsed) ? parsed as T[] : null;
  } catch {
    return null;
  }
}
export async function hasLiveMatkul(): Promise<boolean> { return (await readLiveArray<Matkul>("matkul.json")) !== null; }
export async function isTugasLive(): Promise<boolean> { return (await readLiveArray<Tugas>("tugas.json")) !== null; }
export async function getMatkul(): Promise<Matkul[]> { return (await readLiveArray<Matkul>("matkul.json")) ?? (productionPreview ? mockMatkul : []); }
export async function getTugas(): Promise<Tugas[]> { return (await readLiveArray<Tugas>("tugas.json")) ?? (productionPreview ? mockTugas : []); }
export async function getJadwal(): Promise<Jadwal[]> { return (await readLiveArray<Jadwal>("jadwal.json")) ?? (productionPreview ? mockJadwal : []); }
export async function getPertemuan(): Promise<Pertemuan[]> { return (await readLiveArray<Pertemuan>("pertemuan.json")) ?? (productionPreview ? mockPertemuan : []); }
export async function getPresensi(): Promise<Presensi[]> { return (await readLiveArray<Presensi>("presensi.json")) ?? []; }
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
  if (productionPreview) return mockProfil;
  const live = await readLiveProfile();
  return live?.nama ? { nama: live.nama, nim: "", prodi: "", semester: 0 } : { nama: "Mahasiswa", nim: "", prodi: "", semester: 0 };
}
export async function isProfilLive(): Promise<boolean> { return Boolean(await readLiveProfile()); }
export async function getMatkulById(id: string): Promise<Matkul | undefined> { return (await getMatkul()).find((item) => item.id === id); }
