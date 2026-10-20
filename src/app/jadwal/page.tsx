import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { WeeklySchedule } from "@/components/weekly-schedule";
import { Card, PageIntro } from "@/components/ui";
import { getJadwal, getMatkul } from "@/lib/data";

export const metadata: Metadata = { title: "Jadwal kuliah" };

export default async function SchedulePage() {
  const [schedule, courses] = await Promise.all([getJadwal(), getMatkul()]);
  return <><PageIntro eyebrow="Rencana mingguan" title="Jadwal kuliah" detail="Atur ritme belajarmu dan cek kelas berikutnya dengan mudah." /><Card className="mb-5 flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50"><CalendarDays size={19} /></span><div><p className="text-sm font-bold text-slate-900 dark:text-white">Ganjil 2026/2027</p><p className="text-xs text-slate-500">{schedule.length} sesi kelas terjadwal</p></div></Card><WeeklySchedule schedule={schedule} courses={courses} /></>;
}
