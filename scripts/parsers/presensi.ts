import * as cheerio from "cheerio";
import type { Jadwal, Matkul, Presensi } from "@/types/lms";

const tableSelector = ".table.table-striped.table-bordered.table-hover";
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function parsePresensi(html: string): { matkul: Matkul[]; jadwal: Jadwal[]; presensi: Presensi[] } {
  const $ = cheerio.load(html);
  const table = $(tableSelector).first();
  if (!table.length) throw new Error(`Tabel presensi tidak ditemukan (${tableSelector}).`);

  const headers = table.find("thead th").map((_, el) => clean($(el).text())).get();
  const required = ["Kode Mata Kuliah", "Mata Kuliah", "Dosen", "Hari", "Waktu", "Ruang"];
  const index = new Map(headers.map((header, position) => [header.toLowerCase(), position]));
  const missing = required.filter((header) => !index.has(header.toLowerCase()));
  if (missing.length) throw new Error(`Kolom presensi tidak ditemukan: ${missing.join(", ")}.`);

  const courses = new Map<string, Matkul>();
  const schedules: Jadwal[] = [];
  const attendance: Presensi[] = [];
  table.find("tbody tr").each((_, row) => {
    const cells = $(row).children("td").map((__, cell) => clean($(cell).text())).get();
    const value = (header: string) => cells[index.get(header.toLowerCase()) ?? -1] ?? "";
    const kode = value("Kode Mata Kuliah");
    const nama = value("Mata Kuliah");
    const dosen = value("Dosen");
    const matkulId = slug(kode);
    if (!kode || !nama || !matkulId) return;

    // SKS, semester, dan progres tidak ada pada tabel presensi, jadi tidak dibuat-buat.
    if (!courses.has(matkulId)) {
      courses.set(matkulId, { id: matkulId, nama, kode, dosen, ruang: value("Ruang") || undefined });
    }
    attendance.push({ id: matkulId, matkulId, pertemuan: value("Pertemuan"), hadir: value("Hadir") });

    const range = value("Waktu").match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!range) return;
    schedules.push({
      id: `${matkulId}-${slug(value("Hari"))}-${range[1].replace(":", "")}`,
      matkulId,
      hari: value("Hari"),
      jamMulai: range[1],
      jamSelesai: range[2],
      ruang: value("Ruang") || undefined,
      dosen,
    });
  });

  if (!courses.size) throw new Error("Tidak ada baris mata kuliah yang dapat dibaca dari tabel presensi.");
  return { matkul: [...courses.values()], jadwal: schedules, presensi: attendance };
}
