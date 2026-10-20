"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, LoaderCircle } from "lucide-react";

export function SessionActions() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshStatus(): Promise<{ authenticated: boolean; dataReady: boolean }> {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const data = await response.json();
      const status = { authenticated: Boolean(data.authenticated), dataReady: Boolean(data.dataReady) };
      setAuthenticated(status.authenticated);
      setDataReady(status.dataReady);
      return status;
    } catch {
      setAuthenticated(false);
      setDataReady(false);
      return { authenticated: false, dataReady: false };
    }
  }

  useEffect(() => { void refreshStatus(); }, []);

  // Login tetap dilakukan manual di Chromium agar CAPTCHA tidak disentuh otomatis.
  async function login() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Login gagal dimulai.");
      setAuthenticated(false);
      setDataReady(false);
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
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Logout gagal.");
      setAuthenticated(false);
      setDataReady(false);
      setMessage(data.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logout gagal.");
    } finally {
      setBusy(false);
    }
  }

  const buttonClass = "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-60 sm:text-sm";
  return <div className="flex flex-col items-end gap-1">
    <div className="flex items-center gap-2">
      <button type="button" onClick={login} disabled={busy} title="Buka login LMS manual di Chromium" className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <LogIn size={15} />}<span>{authenticated ? "Login ulang" : "Login LMS"}</span>
      </button>
      {authenticated && <button type="button" onClick={logout} disabled={busy} title="Hapus auth.json lokal" aria-label="Keluar dan hapus sesi lokal" className={`${buttonClass} border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}>
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}<span>Keluar</span>
      </button>}
    </div>
    {authenticated === false && <span className="text-[10px] text-amber-600 dark:text-amber-400">Data contoh · belum login</span>}
    {authenticated && <span className="text-[10px] text-slate-400">{dataReady ? "Data akun tersinkron" : "Sinkronisasi data berjalan"}</span>}
    {message && <span role="status" className="max-w-48 text-right text-[10px] leading-4 text-slate-500">{message}</span>}
  </div>;
}
