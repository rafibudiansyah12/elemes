import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import type { Tugas } from "@/types/lms";
import type { AssignmentLink } from "./pertemuan";

const months: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4,
  mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agustus: 8, sep: 9,
  september: 9, okt: 10, oktober: 10, nov: 11, november: 11, des: 12, desember: 12,
};
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

// Tanggal tanpa zona pada LMS diperlakukan sebagai waktu Asia/Jakarta (UTC+7).
export function parseJakartaDate(text: string): string | undefined {
  const normalized = clean(text);
  const iso = Date.parse(normalized);
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized) && Number.isFinite(iso)) return new Date(iso).toISOString();
  const match = normalized.match(/([0-9]{1,2})\s+([\p{L}.]+)\s+([0-9]{4})[^0-9]*([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?/u);
  if (!match) return undefined;
  const month = months[match[2].toLowerCase().replace(/\.$/, "")];
  if (!month) return undefined;
  const day = Number(match[1]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  if (day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return undefined;
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second)).toISOString();
}

export function parseTugas(html: string, source: AssignmentLink, now = new Date()): Tugas {
  const $ = cheerio.load(html);
  const tables = $("table");
  const deadlineText = tables.eq(0).find("tr").toArray().map((row) => {
    const label = clean($(row).children("th").first().text()).toLowerCase();
    return label === "akhir submit" ? clean($(row).children("td").first().text()) : "";
  }).find(Boolean);
  const deadline = deadlineText ? parseJakartaDate(deadlineText) : undefined;
  if (!deadline) throw new Error("Tanggal akhir submit tidak ditemukan atau formatnya belum didukung.");

  const statusText = tables.eq(1).find("tr").toArray().map((row) => {
    const label = clean($(row).children("th").first().text()).toLowerCase();
    return label === "status submit" ? clean($(row).children("td").first().text()).toLowerCase() : "";
  }).find(Boolean) ?? "";
  const expired = new Date(deadline).getTime() < now.getTime();
  let status: Tugas["status"];
  if (/terlambat|late/.test(statusText)) status = "terlambat";
  else if (/sudah|dikumpulkan|submitted|uploaded|terkirim/.test(statusText)) status = "dikumpulkan";
  else if (/belum|not submitted|not yet/.test(statusText)) status = expired ? "terlambat" : "belum";
  else status = expired ? "terlambat" : "belum";

  const id = createHash("sha256").update(`${source.matkulId}:${source.title}`).digest("hex").slice(0, 16);
  return { id, matkulId: source.matkulId, judul: source.title, deadline, status, link: source.url };
}
