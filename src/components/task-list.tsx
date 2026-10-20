"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Matkul, Tugas } from "@/types/lms";
import { EmptyState } from "@/components/ui";
import { TaskCard } from "@/components/task-card";

const filters = [
  { id: "semua", label: "Semua" }, { id: "belum", label: "Belum" },
  { id: "dikumpulkan", label: "Dikumpulkan" }, { id: "terlambat", label: "Terlambat" },
] as const;

export function TaskList({ tasks, courses }: { tasks: Tugas[]; courses: Matkul[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("semua");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => tasks.filter((task) => (filter === "semua" || task.status === filter)
    && `${task.judul} ${courses.find((course) => course.id === task.matkulId)?.nama ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()), [tasks, courses, filter, query]);
  return <div>
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${filter === item.id ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>{item.label}{item.id !== "semua" && <span className="ml-1 opacity-70">{tasks.filter((task) => task.status === item.id).length}</span>}</button>)}</div><label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 lg:w-72"><Search size={16} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tugas atau mata kuliah" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></label></div>
    {visible.length ? <div className="grid gap-3">{visible.map((task, index) => <TaskCard key={task.id} task={task} matkul={courses.find((course) => course.id === task.matkulId)} index={index} />)}</div> : <EmptyState title={query ? "Tugas tidak ditemukan" : "Tidak ada tugas, santai dulu"} detail={query ? "Coba kata kunci lain." : "Belum ada tugas pada kategori ini."} />}
  </div>;
}
