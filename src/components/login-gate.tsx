"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { LmsRelayLogin } from "@/components/lms-relay-login";

type Props = { localMode: boolean; authenticated: boolean; dataReady: boolean };

export function LoginGate({ localMode, authenticated: initialAuthenticated, dataReady: initialDataReady }: Props) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [dataReady, setDataReady] = useState(initialDataReady);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reloading = useRef(false);

  useEffect(() => {
    if (!localMode) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        const status = await response.json() as { authenticated?: boolean; dataReady?: boolean; sync?: { state?: string; message?: string; current?: number; total?: number } | null };
        setAuthenticated(Boolean(status.authenticated));
        setDataReady(Boolean(status.dataReady));
        if (status.authenticated && status.dataReady && !reloading.current) {
          reloading.current = true;
          window.location.reload();
        } else if (status.sync?.state === "error") {
          setMessage(status.sync.message || "Sinkronisasi gagal. Coba lagi.");
        } else if (status.authenticated && status.sync?.state === "running") {
          const progress = status.sync.current !== undefined && status.sync.total !== undefined ? ` (${status.sync.current}/${status.sync.total})` : "";
          setMessage(`${status.sync.message || "Menyiapkan data LMS"}${progress}...`);
        } else if (status.authenticated) {
          setMessage("Sesi tersimpan. Menyiapkan data akun LMS...");
        }
      } catch {
        setMessage("Status sesi lokal belum dapat diperiksa.");
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [localMode]);

  async function startLogin() {
    setBusy(true);
    setMessage("Membuka jendela login LMS...");
    try {
      const response = await fetch("/api/auth/login", { method: "POST" });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Login gagal dimulai.");
      setMessage("Login di Chromium dan isi CAPTCHA secara manual. Dashboard terbuka setelah data selesai disinkronkan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login gagal dimulai.");
    } finally {
      setBusy(false);
    }
  }

  async function retrySync() {
    setBusy(true);
    setMessage("Memulai sinkronisasi data LMS...");
    try {
      const response = await fetch("/api/scrape", { method: "POST" });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Sinkronisasi gagal dimulai.");
      setMessage("Sinkronisasi berjalan. Halaman akan terbuka otomatis setelah selesai.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sinkronisasi gagal dimulai.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen min-h-[100svh] place-items-center bg-gradient-to-br from-slate-50 via-white to-blue-50/70 px-4 py-6 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/30 sm:py-10">
    <section className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xl shadow-slate-300/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 sm:p-9">
      <div className="mb-7 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><BookOpenCheck size={23} /></span><div><p className="text-lg font-bold text-slate-900 dark:text-white">RuangKelas</p><p className="text-sm text-slate-500">Portal akademik pribadi</p></div></div>
      <div className="mb-6"><p className="text-sm font-semibold text-blue-600">Akses mahasiswa</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Masuk dengan akun LMS</h1>{localMode && <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Dashboard menampilkan data dari sesi LMS yang tersimpan.</p>}</div>
      {!localMode ? <LmsRelayLogin authenticated={initialAuthenticated} dataReady={initialDataReady} /> : <>
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={17} /><p>Login dibuka di Chromium pada komputer ini. Masukkan akun dan CAPTCHA langsung di LMS; password tidak disimpan oleh dashboard.</p></div>
        {authenticated && !dataReady ? <button type="button" onClick={retrySync} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={16} />} Coba sinkronkan data</button> : <button type="button" onClick={startLogin} disabled={busy || authenticated} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy || authenticated ? <LoaderCircle size={17} className="animate-spin" /> : <BookOpenCheck size={17} />}{authenticated ? "Menyiapkan dashboard..." : "Login dengan akun LMS"}</button>}
        <p role="status" className="mt-4 min-h-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{message || (authenticated ? "Sesi terdeteksi. Menunggu sinkronisasi data..." : "Setelah berhasil masuk, data akan disinkronkan otomatis.")}</p>
      </>}
      <p className="mt-6 border-t border-slate-100 pt-5 text-center text-[11px] leading-5 text-slate-400 dark:border-slate-800">{localMode ? "Sesi dan cache disimpan di folder lokal project ini." : "Sesi sementara berada di memori Railway dan berakhir saat logout atau proses dimulai ulang."}</p>
    </section>
  </main>;
}
