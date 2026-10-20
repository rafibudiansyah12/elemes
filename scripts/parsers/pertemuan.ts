import * as cheerio from "cheerio";
import type { Matkul, Pertemuan, TipeMateri } from "@/types/lms";

const origin = "https://lms.unindra.ac.id";
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

export function findCourseId(html: string, courses: Matkul[]): string | null {
  const text = clean(cheerio.load(html).text());
  const matches = courses.filter((course) => text.includes(course.nama));
  return matches.length === 1 ? matches[0].id : null;
}

export function parsePertemuan(html: string, courses: Matkul[]): Pertemuan | null {
  const $ = cheerio.load(html);
  const matkulId = findCourseId(html, courses);
  if (!matkulId) return null;
  const judul = clean($("h1").first().text());
  const number = judul.match(/pertemuan\D{0,8}([0-9]{1,2})/i)?.[1];
  if (!judul || !number) return null;

  const materi: Pertemuan["materi"] = [];
  $("table.table.table-hover.table-striped a[href*='/pertemuan/force_download/']").each((_, anchor) => {
    const href = $(anchor).attr("href");
    if (!href) return;
    const url = new URL(href, origin);
    if (url.origin !== origin) return;
    const label = clean($(anchor).text()) || "Materi pertemuan";
    const icon = $(anchor).find("i").attr("class") ?? "";
    const tipe: TipeMateri = /fa-file-pdf/i.test(icon) ? "pdf" : /fa-file-video/i.test(icon) ? "video" : "link";
    materi.push({ nama: label, tipe, url: url.toString() });
  });

  const id = `${matkulId}-pertemuan-${String(Number(number)).padStart(2, "0")}`;
  return { id, matkulId, pertemuanKe: Number(number), judul, materi };
}

export type AssignmentLink = { url: string; title: string; matkulId: string };

export function parseAssignmentLinks(html: string, matkulId: string): AssignmentLink[] {
  const $ = cheerio.load(html);
  const links = new Map<string, AssignmentLink>();
  $("a[href*='/member_tugas/kelas/']").each((_, anchor) => {
    const href = $(anchor).attr("href");
    if (!href) return;
    const url = new URL(href, origin);
    if (url.origin !== origin) return;
    const title = clean($(anchor).text()).replace(/^assignment\s*:\s*/i, "");
    if (!title) return;
    const previous = links.get(url.toString());
    links.set(url.toString(), { url: url.toString(), title: previous?.title || title, matkulId });
  });
  return [...links.values()];
}
