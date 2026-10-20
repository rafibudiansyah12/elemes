"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, LoaderCircle } from "lucide-react";

export function SessionActions({ localMode = true, compact = false }: { localMode?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshStatus(): Promise<{ authenticated: boolean; dataReady: boolean }> {
    try {
      const response = await fetch(localMode ? "/api/auth/status" : "/api/lms/session", { cache: "no-store" });
      const data = await response.json();
      const status = { authenticated: Boolean(data.authenticated), dataReady: Boolean(data.dataReady) };
      setAuthenticated(status.authenticated);
      return status;
    } catch {
      setAuthenticated(false);
      return { authenticated: false, dataReady: false };
    }
  }

  useEffect(() => { void refreshStatus(); }, [localMode]);

  async function login() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Login gagal dimulai.");
      setAuthenticated(false);
      setMessage(`${data.message} Setelah berhasil login, data akun akan disinkronkan.`);
      const startedAt = Date.now();
      let synchronized = false;
      while (Date.now() - startedAt < 15 * 60 * 1000) {
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
        const status = await refreshStatus();
        if (status.authenticated && status.dataReady) {
          setMessage("Login berhasil. Data akun baru sudah tersinkron.");
          router.refresh();
          synchronized = true;
          break;
        }
        if (status.authenticated) setMessage("Sesi baru tersimpan. Sinkronisasi data sedang berjalan...");
      }
      if (!synchronized) setMessage("Sinkronisasi belum selesai. Jalankan npm run scrape di terminal untuk melihat pesan error.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login gagal dimulai.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(localMode ? "/api/auth/logout" : "/api/lms/session", { method: localMode ? "POST" : "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Logout gagal.");
      setAuthenticated(false);
      setMessage(data.message ?? "Sesi sementara telah dihapus.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logout gagal.");
    } finally {
      setBusy(false);
    }
  }

  const buttonClass = compact
    ? "inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition disabled:opacity-60"
    : "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition disabled:opacity-60 sm:text-sm";
  return <div className="flex min-w-0 flex-col items-start gap-2">
    {localMode && !authenticated && <button type="button" onClick={login} disabled={busy} title="Buka login LMS manual di Chromium" className={`${buttonClass} bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700`}>
      {busy ? <LoaderCircle size={15} className="animate-spin" /> : <LogIn size={15} />}<span>Login LMS</span>
    </button>}
    {authenticated && <button type="button" onClick={logout} disabled={busy} title="Keluar dari sesi LMS" aria-label="Keluar dari sesi LMS" className={`${buttonClass} border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm backdrop-blur hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300`}>
      {busy ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}<span>Keluar</span>
    </button>}
    {authenticated === false && <span className="text-[10px] text-amber-600 dark:text-amber-400">Belum login LMS</span>}
    {message && <span role="status" className="max-w-48 text-[10px] leading-4 text-slate-500">{message}</span>}
  </div>;
}
