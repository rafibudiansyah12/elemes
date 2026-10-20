import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext } from "playwright";
import * as cheerio from "cheerio";

const profileUrl = "https://lms.unindra.ac.id/member/profil";

// Selector .profile-username sudah terverifikasi dari HTML dump halaman profil.
export async function cacheLmsProfile(context: BrowserContext, sessionFingerprint: string) {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  const page = await context.newPage();
  try {
    const response = await page.goto(profileUrl, { waitUntil: "networkidle", timeout: 45_000 });
    if (page.url().toLowerCase().includes("login")) throw new Error("Sesi habis, jalankan: npm run login");
    if (!response?.ok()) throw new Error(`Halaman profil gagal dimuat (HTTP ${response?.status() ?? "tanpa respons"}).`);

    const $ = cheerio.load(await page.content());
    const nama = $(".profile-username").first().text().replace(/\s+/g, " ").trim();
    if (!nama) throw new Error("Nama profil tidak ditemukan pada halaman LMS; periksa dump terbaru.");

    const outputDir = path.join(process.cwd(), "data", "live");
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "profil.json"), JSON.stringify({ nama, scrapedAt: new Date().toISOString(), sessionFingerprint }, null, 2), "utf8");
  } finally {
    await page.close();
  }
}
