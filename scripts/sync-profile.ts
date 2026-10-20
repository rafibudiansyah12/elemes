import { chromium } from "playwright";
import { cacheLmsProfile } from "./profile-cache";
import { getSessionFingerprint } from "./session";

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: "auth.json" });
    await cacheLmsProfile(context, await getSessionFingerprint());
    console.log("Nama profil LMS berhasil diperbarui di cache lokal.");
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Gagal memperbarui profil LMS.");
  process.exitCode = 1;
});
