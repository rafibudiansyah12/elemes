"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { Matkul, Tugas } from "@/types/lms";
import { formatDate, isUrgent, relativeDeadline } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

const statusLabel = { belum: "Belum dikerjakan", dikumpulkan: "Dikumpulkan", terlambat: "Terlambat" };

export function DeadlineChip({ task }: { task: Tugas }) {
  const urgent = isUrgent(task);
  const tone = task.status === "terlambat" ? "red" : task.status === "dikumpulkan" ? "green" : urgent ? "amber" : "slate";
  const text = task.status === "dikumpulkan" ? statusLabel[task.status] : relativeDeadline(task.deadline);
  return <Badge tone={tone}><Clock3 size={12} className="mr-1" />{text}</Badge>;
}

export function TaskCard({ task, matkul, index = 0 }: { task: Tugas; matkul?: Matkul; index?: number }) {
  const urgent = isUrgent(task);
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.045, 0.25) }} whileHover={{ y: -2 }}><Card className={`p-4 transition-shadow hover:shadow-md ${urgent ? "border-amber-300 dark:border-amber-700" : ""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{task.judul}</p><p className="mt-1 truncate text-xs text-slate-500">{matkul?.nama ?? "Mata kuliah"}</p></div><DeadlineChip task={task} /></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"><span className="text-xs text-slate-500">{formatDate(task.deadline)}</span><Link href={task.link} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Detail <ArrowUpRight size={14} /></Link></div></Card></motion.div>;
}
