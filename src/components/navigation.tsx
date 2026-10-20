"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, CheckSquare2, ClipboardCheck, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionActions } from "@/components/session-actions";

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

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 dark:border-slate-800 dark:bg-slate-950 lg:flex"><Brand /><p className="mb-3 mt-11 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Menu utama</p><nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"}`}><Icon size={18} strokeWidth={1.8} />{label}</Link>;
  })}</nav><div className="mt-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-sm font-semibold text-slate-800 dark:text-white">Tetap teratur ✨</p><p className="mt-1 text-xs leading-5 text-slate-500">Satu langkah kecil hari ini membawa kamu lebih dekat ke tujuan.</p></div><div className="mt-5 flex items-center justify-between"><Brand /><ThemeToggle /></div></aside>;
}

export function MobileNav() {
  const pathname = usePathname();
  return <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">{links.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-blue-600" : "text-slate-400"}`}><Icon size={20} strokeWidth={1.9} />{label}</Link>;
  })}</nav>;
}

export function Topbar({ profileName, localMode }: { profileName: string; localMode: boolean }) {
  const initials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-8 lg:px-10"><div className="lg:hidden"><Brand /></div><p className="hidden text-sm text-slate-500 lg:block">Semester berjalan <span className="ml-1 font-semibold text-slate-800 dark:text-slate-200">Ganjil 2026/2027</span></p><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{profileName}</p><p className="text-xs text-slate-500">{localMode ? "Mode lokal" : "Sesi LMS sementara"}</p></div><span className="hidden h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 sm:grid">{initials}</span><SessionActions localMode={localMode} /><div className="lg:hidden"><ThemeToggle /></div></div></header>;
}

export function AppShell({ children, profileName, localMode, updatedAt }: { children: React.ReactNode; profileName: string; localMode: boolean; updatedAt: string | null }) {
  const formattedUpdate = updatedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(updatedAt)) : null;
  return <><Sidebar /><div className="min-h-screen lg:pl-64"><Topbar profileName={profileName} localMode={localMode} /><main className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-8 lg:px-10 lg:pb-10">{!localMode && <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-100"><span>Data diambil langsung dari LMS. Sesi dan hasil baca hanya berada sementara di memori backend selama sesi aktif.</span>{formattedUpdate && <span className="text-xs text-blue-800 dark:text-blue-200">Terakhir diperbarui: {formattedUpdate}</span>}</div>}{children}</main></div><MobileNav /></>;
}
