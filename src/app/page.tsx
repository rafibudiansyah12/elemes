import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarClock, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { Badge, Card, EmptyState, PageIntro } from "@/components/ui";
import { TaskCard } from "@/components/task-card";
import { getGreeting, isUrgent, todayName } from "@/lib/format";
import { getJadwal, getMatkul, getProfil, getTugas, hasLiveMatkul, isProfilLive, isTugasLive } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [courses, tasks, schedule, profile, liveProfile, liveCourses, liveTasks] = await Promise.all([getMatkul(), getTugas(), getJadwal(), getProfil(), isProfilLive(), hasLiveMatkul(), isTugasLive()]);
  const today = todayName();
  const todaySchedule = schedule.filter((item) => item.hari.toLowerCase() === today.toLowerCase()).sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  const nearestTasks = tasks.filter((task) => task.status !== "dikumpulkan").sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 5);
  const openCount = tasks.filter((task) => task.status === "belum").length;
  const urgentCount = tasks.filter((task) => isUrgent(task)).length;
  const stats = [
    { label: "Mata kuliah", value: courses.length, note: "Semester ini", icon: BookOpen, tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/50" },
    { label: "Tugas belum selesai", value: openCount, note: "Perlu perhatian", icon: CheckCircle2, tone: "text-violet-600 bg-violet-50 dark:bg-violet-950/50" },
    { label: "Tenggat mendesak", value: urgentCount, note: "Kurang dari 24 jam", icon: Clock3, tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/50" },
  ];
  return <div><PageIntro eyebrow="Ringkasan akademik" title={`${getGreeting()}, ${profile.nama.split(" ")[0]} 👋`} detail="Semoga harimu produktif. Ini ringkasan yang perlu kamu ketahui hari ini." />
    <div className="mb-6 grid gap-4 sm:grid-cols-3">{stats.map(({ label, value, note, icon: Icon, tone }) => <Card key={label} className="flex items-center gap-4 p-5"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon size={21} /></span><span><span className="block text-2xl font-bold text-slate-900 dark:text-white">{value}</span><span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span><span className="mt-0.5 block text-xs text-slate-400">{note}</span></span></Card>)}</div>
    <Card className="mb-7 flex flex-col justify-between gap-5 overflow-hidden bg-gradient-to-r from-blue-700 to-blue-600 p-6 text-white sm:flex-row sm:items-center sm:px-8"><div><Badge tone="blue"><Sparkles size={13} className="mr-1" /> Fokus hari ini</Badge><h2 className="mt-3 text-xl font-bold">Satu per satu, semua bisa selesai.</h2><p className="mt-1 text-sm text-blue-100">Cek jadwal dan prioritaskan tugas terdekatmu.</p></div><Link href="/tugas" className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50">Lihat daftar tugas <ArrowRight size={16} /></Link></Card>
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><section><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">{today}</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Jadwal hari ini</h2></div><Link href="/jadwal" className="text-xs font-semibold text-blue-600 hover:underline">Lihat semua <ArrowUpRight className="inline" size={14} /></Link></div><Card className="space-y-1 p-2">{todaySchedule.length ? todaySchedule.map((item) => <div key={item.id} className="flex gap-4 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"><div className="w-[76px] shrink-0 pt-0.5"><p className="text-sm font-bold text-slate-900 dark:text-white">{item.jamMulai}</p><p className="mt-1 text-[11px] text-slate-400">{item.jamSelesai}</p></div><div className="border-l-2 border-blue-500 pl-4"><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{courses.find((course) => course.id === item.matkulId)?.nama}</p><p className="mt-1 text-xs text-slate-500">{item.ruang} <span className="px-1">·</span> {item.dosen}</p></div></div>) : <div className="p-2"><EmptyState title={liveCourses ? "Jadwal hari ini kosong" : "Tidak ada kelas hari ini"} detail={liveCourses ? "Jadwal yang tersedia berasal dari tabel presensi LMS." : "Nikmati jeda di antara aktivitasmu."} /></div>}</Card></section>
      <section><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Prioritas</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Tugas terdekat</h2></div><Link href="/tugas" className="text-xs font-semibold text-blue-600 hover:underline">Semua tugas <ArrowUpRight className="inline" size={14} /></Link></div><div className="space-y-3">{nearestTasks.length ? nearestTasks.map((task, index) => <TaskCard key={task.id} task={task} matkul={courses.find((course) => course.id === task.matkulId)} index={index} />) : liveCourses && !liveTasks ? <Card className="p-5 text-sm text-slate-500">Data tugas LMS belum tersambung. Buka halaman Tugas untuk detail.</Card> : <EmptyState />}</div></section></div>
    <div className="mt-7 flex items-center gap-2 text-xs text-slate-400"><CalendarClock size={14} />{liveProfile && liveCourses ? "Profil, mata kuliah, dan jadwal dibaca dari LMS" : liveProfile ? "Nama dari profil LMS · data perkuliahan masih berupa contoh" : `Data contoh untuk ${profile.prodi} · Semester ${profile.semester}`}</div>
  </div>;
}
