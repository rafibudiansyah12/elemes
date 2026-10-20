"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText, Link2, PlayCircle, Paperclip } from "lucide-react";
import type { Pertemuan } from "@/types/lms";
import { formatDate } from "@/lib/format";

const materialIcons = { pdf: FileText, video: PlayCircle, link: Link2, lainnya: Paperclip };

export function MeetingList({ meetings }: { meetings: Pertemuan[] }) {
  const [open, setOpen] = useState<string | null>(meetings[0]?.id ?? null);
  return <div className="space-y-3">{meetings.map((meeting) => {
    const expanded = open === meeting.id;
    return <section key={meeting.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><button onClick={() => setOpen(expanded ? null : meeting.id)} className="flex w-full items-center gap-4 p-4 text-left sm:px-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">{meeting.pertemuanKe.toString().padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{meeting.judul}</span><span className="mt-1 block text-xs text-slate-500">{meeting.tanggal ? formatDate(meeting.tanggal) : "Tanggal belum tersedia"}</span></span><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} /></button><AnimatePresence initial={false}>{expanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">{meeting.materi.map((material) => { const Icon = materialIcons[material.tipe]; return <a href={material.url} key={material.nama} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><span className="text-blue-600"><Icon size={17} /></span><span className="flex-1">{material.nama}</span><span className="text-[10px] font-bold uppercase text-slate-400">{material.tipe}</span></a>; })}</div></motion.div>}</AnimatePresence></section>;
  })}</div>;
}
