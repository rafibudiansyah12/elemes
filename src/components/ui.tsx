"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "green" | "amber" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    red: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 0.7, ease: "easeOut" }} className="h-full rounded-full bg-blue-600" /></div>;
}

export function EmptyState({ title = "Tidak ada tugas, santai dulu", detail = "Semua yang perlu kamu perhatikan akan muncul di sini." }: { title?: string; detail?: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-5 text-center dark:border-slate-700"><span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50">✦</span><p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>;
}

export function PageIntro({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7"><p className="text-sm font-semibold text-blue-600">{eyebrow}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>{detail && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{detail}</p>}</motion.div>;
}
