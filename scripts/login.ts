import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { cacheLmsProfile } from "./profile-cache";
import { clearLiveCache } from "./live-cache";
import { getSessionFingerprint } from "./session";

const loginUrl = "https://lms.unindra.ac.id/login_new";

async function main() {
  // Login ulang berarti berpindah sesi lokal; hentikan status sesi akun sebelumnya.
  try { await unlink(path.resolve("auth.json")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  let loginSucceeded = false;

  try {
    console.log("Silakan login dan isi CAPTCHA di jendela Chromium yang terbuka.");
    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === "/member", {
      timeout: 10 * 60_000,
    });
    // Bersihkan cache akun sebelumnya sebelum menyimpan identitas akun baru.
    await clearLiveCache();
    await context.storageState({ path: "auth.json" });
    loginSucceeded = true;
    console.log("Sesi tersimpan di auth.json. Jangan bagikan file ini.");
    try {
      await cacheLmsProfile(context, await getSessionFingerprint());
      console.log("Nama profil LMS berhasil diperbarui di cache lokal.");
    } catch (error) {
      console.error("Sesi tersimpan, profil belum tersinkron:", error instanceof Error ? error.message : "gagal membaca profil");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Waktu login habis. Jalankan kembali: npm run login");
    }
    throw error;
  } finally {
    await browser.close();
  }

  if (loginSucceeded) {
    const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
    const scraper = spawn(process.execPath, [tsxCli, "scripts/scrape.ts"], {
      cwd: process.cwd(), detached: true, stdio: "ignore", windowsHide: true,
    });
    scraper.on("error", () => console.error("Data belum tersinkron. Jalankan: npm run scrape"));
    scraper.unref();
    console.log("Sinkronisasi data akun baru dimulai di latar belakang.");
  }
}

main().catch((error: unknown) => {
  console.error("Login gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
