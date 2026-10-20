import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, MapPin, UserRound } from "lucide-react";
import { MeetingList } from "@/components/meetings";
import { TaskCard } from "@/components/task-card";
import { Badge, Card, PageIntro, ProgressBar } from "@/components/ui";
import { getMatkul, getMatkulById, getPertemuan, getTugas, hasLiveMatkul, isTugasLive } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateStaticParams() { return (await getMatkul()).map((course) => ({ id: course.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const course = await getMatkulById(id);
  return { title: course?.nama ?? "Mata kuliah" };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, meetings, tasks, liveCourses, liveTasks] = await Promise.all([getMatkulById(id), getPertemuan(), getTugas(), hasLiveMatkul(), isTugasLive()]);
  if (!course) notFound();
  const courseMeetings = meetings.filter((meeting) => meeting.matkulId === id).sort((a, b) => a.pertemuanKe - b.pertemuanKe);
  const courseTasks = tasks.filter((task) => task.matkulId === id).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const bobot = course.sks === undefined ? "Belum tersedia" : `${course.sks} SKS`;
  const semester = course.semester === undefined ? "" : ` · Semester ${course.semester}`;

  return <>
    <Link href="/matkul" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"><ArrowLeft size={16} />Kembali ke mata kuliah</Link>
    <PageIntro eyebrow={course.kode} title={course.nama} detail="Informasi yang tersedia dari halaman LMS." />
    <div className="mb-7 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
      <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge tone="blue">{course.kode}</Badge><h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Informasi kelas</h2></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50"><BookOpen size={20} /></span></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="text-sm"><p className="text-xs text-slate-400">Dosen pengampu</p><p className="mt-1 flex gap-2 font-semibold text-slate-700 dark:text-slate-200"><UserRound size={15} className="text-blue-600" />{course.dosen}</p></div><div className="text-sm"><p className="text-xs text-slate-400">Bobot / semester</p><p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{bobot}{semester}</p></div><div className="text-sm"><p className="text-xs text-slate-400">Ruang</p><p className="mt-1 flex gap-2 font-semibold text-slate-700 dark:text-slate-200"><MapPin size={15} className="text-blue-600" />{course.ruang || "Belum ditentukan"}</p></div></div>
      </Card>
      <Card className="p-5"><p className="text-xs text-slate-500">Progres materi</p>{course.progress === undefined ? <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Belum tersedia dari LMS</p> : <><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{course.progress}<span className="text-base text-slate-400">%</span></p><div className="mt-5"><ProgressBar value={course.progress} /></div></>}</Card>
    </div>
    <div className="grid gap-7 xl:grid-cols-[1.25fr_0.75fr]"><section><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Materi kelas</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Pertemuan</h2></div><span className="text-xs text-slate-400">{courseMeetings.length} pertemuan</span></div>{courseMeetings.length ? <MeetingList meetings={courseMeetings} /> : <Card className="p-5 text-sm text-slate-500">Materi pertemuan belum tersambung.</Card>}</section>
      <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Yang perlu dikerjakan</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Tugas mata kuliah</h2></div><div className="space-y-3">{courseTasks.length ? courseTasks.map((task, index) => <TaskCard key={task.id} task={task} matkul={course} index={index} />) : <Card className="p-5 text-sm text-slate-500">{liveCourses && !liveTasks ? "Data tugas LMS belum tersambung." : "Tidak ada tugas untuk mata kuliah ini."}</Card>}</div></section>
    </div>
  </>;
}
