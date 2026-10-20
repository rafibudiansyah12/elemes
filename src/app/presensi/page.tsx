import type { Metadata } from "next";
import { ClipboardCheck, UserCheck } from "lucide-react";
import { Card, EmptyState, PageIntro } from "@/components/ui";
import { getMatkul, getPresensi } from "@/lib/data";

export const metadata: Metadata = { title: "Presensi" };

export default async function AttendancePage() {
  const [attendance, courses] = await Promise.all([getPresensi(), getMatkul()]);
  return <><PageIntro eyebrow="Rekap akademik" title="Presensi" detail="Rekap kehadiran yang tersedia dari halaman presensi LMS." />
    {attendance.length ? <><Card className="mb-5 flex items-center gap-4 p-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50"><UserCheck size={22} /></span><div><p className="text-2xl font-bold text-slate-900 dark:text-white">{attendance.length}</p><p className="text-sm text-slate-500">rekap mata kuliah</p></div></Card><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{attendance.map((item) => <Card key={item.id} className="p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><ClipboardCheck size={19} /></span><div className="min-w-0"><h2 className="font-bold text-slate-900 dark:text-white">{courses.find((course) => course.id === item.matkulId)?.nama ?? item.matkulId}</h2><p className="mt-1 text-xs text-slate-500">{item.matkulId}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><div><p className="text-xs text-slate-400">Pertemuan</p><p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{item.pertemuan || "—"}</p></div><div><p className="text-xs text-slate-400">Hadir</p><p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{item.hadir || "—"}</p></div></div></Card>)}</div></> : <EmptyState title="Data presensi belum tersedia" detail="Jalankan npm run scrape untuk membaca rekap dari LMS." />}
  </>;
}
