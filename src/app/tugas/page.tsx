import type { Metadata } from "next";
import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { TaskList } from "@/components/task-list";
import { Badge, Card, PageIntro } from "@/components/ui";
import { getMatkul, getTugas, hasLiveMatkul, isTugasLive } from "@/lib/data";
import { isUrgent } from "@/lib/format";

export const metadata: Metadata = { title: "Tugas" };

export default async function TasksPage() {
  const [tasks, courses, liveCourses, liveTasks] = await Promise.all([getTugas(), getMatkul(), hasLiveMatkul(), isTugasLive()]);
  const remaining = tasks.filter((task) => task.status === "belum").length;
  const urgent = tasks.filter((task) => isUrgent(task)).length;
  const submitted = tasks.filter((task) => task.status === "dikumpulkan").length;
  return <><PageIntro eyebrow="Daftar pekerjaan" title="Tugas kuliah" detail="Pantau tenggat, cari tugas, dan lihat mana yang sudah kamu kumpulkan." />
    {liveCourses && !liveTasks && <Card className="mb-5 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Data tugas LMS belum tersambung. Halaman dump yang tersedia belum memuat daftar tugas, jadi tugas contoh disembunyikan.</Card>}
    <div className="mb-6 grid gap-3 sm:grid-cols-3">{[{ label: "Belum dikerjakan", value: remaining, icon: ClipboardList, tone: "text-blue-600" }, { label: "Mendesak · < 24 jam", value: urgent, icon: AlertCircle, tone: "text-amber-600" }, { label: "Sudah dikumpulkan", value: submitted, icon: CheckCircle2, tone: "text-emerald-600" }].map(({ label, value, icon: Icon, tone }) => <Card key={label} className="flex items-center gap-3 p-4"><span className={tone}><Icon size={19} /></span><span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span><span className="text-xs font-medium text-slate-500">{label}</span></Card>)}</div>
    <TaskList tasks={tasks} courses={courses} />
    <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Badge tone="amber">Mendesak</Badge> tenggat kurang dari 24 jam.</p>
  </>;
}
