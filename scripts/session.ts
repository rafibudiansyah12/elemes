import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Sidik sesi lokal dipakai untuk mencegah cache akun tertukar.
export async function getSessionFingerprint(): Promise<string> {
  const auth = await readFile(path.resolve("auth.json"));
  return createHash("sha256").update(auth).digest("hex");
}
