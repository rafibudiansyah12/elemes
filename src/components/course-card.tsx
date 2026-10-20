import Link from "next/link";
import { ArrowUpRight, BookOpen, UserRound } from "lucide-react";
import type { Matkul } from "@/types/lms";
import { Badge, Card, ProgressBar } from "@/components/ui";

const colors = ["bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300", "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300", "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300", "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"];

export function CourseCard({ course, index = 0 }: { course: Matkul; index?: number }) {
  return <Link href={`/matkul/${course.id}`} className="group block"><Card className="h-full p-5 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-md">
    <div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${colors[index % colors.length]}`}><BookOpen size={20} /></span><Badge tone="blue">{course.kode}</Badge></div>
    <h2 className="mt-5 min-h-12 text-base font-bold leading-6 text-slate-900 dark:text-white">{course.nama}</h2>
    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><UserRound size={14} /><span className="truncate">{course.dosen}</span></div>
    <p className="mt-4 text-xs text-slate-500">{course.sks === undefined ? "SKS belum tersedia" : `${course.sks} SKS`}{course.semester === undefined ? "" : ` · Semester ${course.semester}`}</p>
    {course.progress !== undefined && <><div className="mt-2 flex justify-between text-xs text-slate-500"><span>Progres materi</span><span>{course.progress}%</span></div><div className="mt-2"><ProgressBar value={course.progress} /></div></>}
    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800"><span>{course.ruang || "Ruang belum ditentukan"}</span><span className="inline-flex items-center gap-1 font-semibold text-blue-600">Buka kelas <ArrowUpRight size={13} /></span></div>
  </Card></Link>;
}
