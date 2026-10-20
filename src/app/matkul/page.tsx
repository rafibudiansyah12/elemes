import type { Metadata } from "next";
import { BookOpenCheck } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { Card, PageIntro } from "@/components/ui";
import { getMatkul, hasLiveMatkul } from "@/lib/data";

export const metadata: Metadata = { title: "Mata kuliah" };

export default async function CoursesPage() {
  const courses = await getMatkul();
  const live = await hasLiveMatkul();
  const credits = courses.reduce((total, course) => total + (course.sks ?? 0), 0);
  const knownCredits = courses.every((course) => course.sks !== undefined);
  return <><PageIntro eyebrow="Pembelajaran" title="Mata kuliah" detail="Daftar mata kuliah yang terbaca dari akun LMS." /><Card className="mb-6 flex items-center gap-4 p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50"><BookOpenCheck size={21} /></span><div><p className="text-sm font-bold text-slate-900 dark:text-white">{live ? "Data dari LMS" : "Data contoh"}</p><p className="mt-1 text-xs text-slate-500">{courses.length} mata kuliah{knownCredits ? ` · ${credits} SKS` : " · Informasi SKS belum tersedia"}</p></div></Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)}</div></>;
}
