import { mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";

// Hapus hanya file cache live yang dibuat scraper.
export async function clearLiveCache() {
  const directory = path.resolve(process.cwd(), "data", "live");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    // Lock tidak dihapus saat ganti akun agar scraper lama bisa selesai/berhenti aman.
    if (entry.isFile() && entry.name !== ".scrape.lock") await unlink(path.join(directory, entry.name));
  }
}
