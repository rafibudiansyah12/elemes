/** Kontrak data untuk UI; scraper tahap berikutnya harus menghasilkan bentuk yang sama. */
export type Matkul = {
  id: string;
  nama: string;
  kode: string;
  dosen: string;
  sks?: number;
  semester?: number;
  ruang?: string;
  progress?: number;
};

export type Tugas = {
  id: string;
  matkulId: string;
  judul: string;
  deskripsi?: string;
  deadline: string;
  status: "belum" | "dikumpulkan" | "terlambat";
  link: string;
};

export type Jadwal = {
  id: string;
  matkulId: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  ruang?: string;
  dosen: string;
};

export type Presensi = { id: string; matkulId: string; pertemuan: string; hadir: string };

export type TipeMateri = "pdf" | "video" | "link" | "lainnya";

export type Pertemuan = {
  id: string;
  matkulId: string;
  pertemuanKe: number;
  judul: string;
  tanggal?: string;
  materi: { nama: string; tipe: TipeMateri; url: string }[];
};

export type Profil = { nama: string; nim: string; prodi: string; semester: number };
