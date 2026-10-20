"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, UserRound } from "lucide-react";
import type { Jadwal, Matkul } from "@/types/lms";
import { EmptyState } from "@/components/ui";
import { todayName } from "@/lib/format";

const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const colors = ["border-l-blue-500 bg-blue-50/70 dark:bg-blue-950/30", "border-l-violet-500 bg-violet-50/70 dark:bg-violet-950/30", "border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30", "border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30"];

export function WeeklySchedule({ schedule, courses }: { schedule: Jadwal[]; courses: Matkul[] }) {
  const today = todayName();
  const [active, setActive] = useState(days.includes(today) ? today : "Senin");
  function dayItems(day: string) { return schedule.filter((item) => item.hari.toLowerCase() === day.toLowerCase()).sort((a, b) => a.jamMulai.localeCompare(b.jamMulai)); }
  return <div><div className="mb-5 flex gap-2 overflow-x-auto pb-1">{days.map((day) => <button key={day} onClick={() => setActive(day)} className={`relative min-w-20 rounded-xl px-3 py-2 text-sm font-semibold transition ${active === day ? "text-blue-700 dark:text-blue-300" : "text-slate-500 hover:bg-white dark:hover:bg-slate-900"}`}><span>{day.slice(0, 3)}</span>{day === today && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />}{active === day && <motion.span layoutId="day-tab" className="absolute inset-0 -z-10 rounded-xl bg-blue-50 dark:bg-blue-950/50" />}</button>)}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{days.map((day) => <div key={day} className={`${active === day ? "block" : "hidden"} md:block`}><div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-slate-900 dark:text-white">{day}</h2>{day === today && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Hari ini</span>}</div><div className="space-y-3">{dayItems(day).length ? dayItems(day).map((item, index) => <motion.article key={item.id} whileHover={{ y: -2 }} className={`rounded-2xl border-l-4 p-4 ${colors[index % colors.length]}`}><p className="text-xs font-bold text-blue-700 dark:text-blue-300">{item.jamMulai} – {item.jamSelesai}</p><h3 className="mt-2 text-sm font-bold leading-5 text-slate-900 dark:text-white">{courses.find((course) => course.id === item.matkulId)?.nama}</h3><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><UserRound size={13} />{item.dosen}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={13} />{item.ruang ?? "Ruang belum ditentukan"}</p></motion.article>) : <EmptyState title="Tidak ada kelas" detail="Kamu bisa gunakan waktu untuk istirahat." />}</div></div>)}</div></div>;
}
