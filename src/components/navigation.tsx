"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, CheckSquare2, ClipboardCheck, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionActions } from "@/components/session-actions";
import { LmsSyncOnboarding } from "@/components/lms-sync-onboarding";
import { PageSkeleton } from "@/components/skeleton";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matkul", label: "Mata kuliah", icon: BookOpen },
  { href: "/tugas", label: "Tugas", icon: CheckSquare2 },
  { href: "/jadwal", label: "Jadwal", icon: CalendarDays },
  { href: "/presensi", label: "Presensi", icon: ClipboardCheck },
];

function Brand() {
  return <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20">RK</span><span><span className="block text-sm font-bold text-slate-900 dark:text-white">RuangKelas</span><span className="block text-xs text-slate-500">Portal akademik</span></span></Link>;
}

export function Sidebar({ localMode }: { localMode: boolean }) {
  const pathname = usePathname();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/60 bg-white/65 px-5 py-6 shadow-[12px_0_40px_-32px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-slate-800/70 dark:bg-slate-950/65 lg:flex">
    <Brand />
    <p className="mb-3 mt-11 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Menu utama</p>
    <nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${active ? "border-blue-200/70 bg-blue-500/10 text-blue-700 shadow-sm dark:border-blue-900/70 dark:text-blue-300" : "border-transparent text-slate-500 hover:border-white/80 hover:bg-white/70 hover:text-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900/70 dark:hover:text-white"}`}><Icon size={18} strokeWidth={1.8} />{label}</Link>;
    })}</nav>
    <div className="mt-auto rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/55"><p className="text-sm font-semibold text-slate-800 dark:text-white">Tetap teratur ✨</p><p className="mt-1 text-xs leading-5 text-slate-500">Satu langkah kecil hari ini membawa kamu lebih dekat ke tujuan.</p></div>
    <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/70 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/55"><SessionActions localMode={localMode} /><ThemeToggle /></div>
  </aside>;
}

export function MobileNav() {
  const pathname = usePathname();
  return <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-white/70 bg-white/75 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-12px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75 lg:hidden">{links.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${active ? "text-blue-600" : "text-slate-400"}`}><Icon size={20} strokeWidth={1.9} />{label}</Link>;
  })}<div className="flex items-center justify-center text-slate-400"><SessionActions compact /></div></nav>;
}

export function Topbar({ profileName, semester, updatedAt }: { profileName: string; semester: number; updatedAt: string | null }) {
  const initials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const updateLabel = updatedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(updatedAt)) : null;
  return <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-white/70 bg-white/55 px-4 shadow-sm shadow-slate-200/20 backdrop-blur-2xl dark:border-slate-800/70 dark:bg-slate-950/55 dark:shadow-black/10 sm:px-8 lg:px-10">
    <div className="lg:hidden"><Brand /></div>
    <div className="hidden lg:block"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{semester > 0 ? `Semester ${semester}` : "Semester belum terdeteksi"}</p><p className="mt-0.5 text-[11px] text-slate-400">{updateLabel ? `Terakhir diperbarui ${updateLabel}` : "Ringkasan akademik"}</p></div>
    <div className="flex items-center gap-2.5 sm:gap-3"><div className="max-w-[48vw] text-right sm:max-w-none"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100 sm:text-sm">{profileName}</p><p className="text-[10px] text-slate-500 sm:hidden">Profil mahasiswa</p></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/80 bg-blue-100/80 text-xs font-bold text-blue-700 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/80 dark:text-blue-300">{initials}</span><div className="lg:hidden"><ThemeToggle /></div></div>
  </header>;
}

export function AppShell({ children, profileName, semester, localMode, updatedAt, dataReady }: { children: React.ReactNode; profileName: string; semester: number; localMode: boolean; updatedAt: string | null; dataReady: boolean }) {
  return <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-slate-100/80 dark:from-blue-950/20 dark:via-slate-950 dark:to-slate-900"><Sidebar localMode={localMode} /><div className="min-h-screen lg:pl-64"><Topbar profileName={profileName} semester={semester} updatedAt={updatedAt} /><main className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-8 lg:px-10 lg:pb-10">{dataReady ? children : <><LmsSyncOnboarding /><PageSkeleton /></>}</main></div><MobileNav /></div>;
}
