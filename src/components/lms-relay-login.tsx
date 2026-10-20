"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";

type Props = { authenticated: boolean; dataReady: boolean };

export function LmsRelayLogin({ authenticated: initialAuthenticated, dataReady: initialDataReady }: Props) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [dataReady, setDataReady] = useState(initialDataReady);
  const [captcha, setCaptcha] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const starting = useRef(false);

  async function loadCaptcha() {
    setMessage("Menghubungi LMS dan memuat CAPTCHA...");
    try {
      const response = await fetch("/api/lms/login", { cache: "no-store" });
      const result = await response.json() as { authenticated?: boolean; dataReady?: boolean; captcha?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "LMS belum dapat dijangkau.");
      setAuthenticated(Boolean(result.authenticated));
      setDataReady(Boolean(result.dataReady));
      setCaptcha(result.captcha || "");
      setMessage(result.authenticated ? "Sesi LMS aktif." : "Isi akun dan CAPTCHA dari LMS.");
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat login LMS.");
      return null;
    }
  }

  async function syncData() {
    setBusy(true);
    setMessage("Membaca data akun langsung dari LMS secara berurutan. Proses pertama dapat memerlukan beberapa menit...");
    try {
      const response = await fetch("/api/lms/data", { method: "POST", cache: "no-store" });
      const result = await response.json() as { matkul?: unknown[]; error?: string; warnings?: string[] };
      if (!response.ok) throw new Error(result.error || "Sinkronisasi LMS gagal.");
      setAuthenticated(true);
      setDataReady(true);
      setMessage(`Data LMS siap: ${result.matkul?.length ?? 0} mata kuliah${result.warnings?.length ? ". Beberapa halaman tidak berhasil dibaca." : "."}`);
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sinkronisasi LMS gagal.";
      setMessage(message);
      if (/sesi|login/i.test(message)) {
        setAuthenticated(false);
        setDataReady(false);
        setCaptcha("");
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (starting.current) return;
    starting.current = true;
    void (async () => {
      const statusResponse = await fetch("/api/lms/session", { cache: "no-store" }).catch(() => null);
      const status = statusResponse?.ok ? await statusResponse.json() as Props : null;
      if (status?.authenticated) {
        setAuthenticated(true);
        setDataReady(Boolean(status.dataReady));
        if (!status.dataReady) await syncData();
      } else await loadCaptcha();
    })();
    // Inisialisasi hanya sekali saat halaman login dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("Meneruskan proses login ke LMS...");
    try {
      const response = await fetch("/api/lms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, captcha: captchaAnswer }),
      });
      const result = await response.json() as { authenticated?: boolean; error?: string };
      setPassword("");
      setCaptchaAnswer("");
      if (!response.ok || !result.authenticated) throw new Error(result.error || "LMS menolak login.");
      setAuthenticated(true);
      await syncData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login LMS gagal.");
      setBusy(false);
      await loadCaptcha();
    }
  }

  return <>
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-slate-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-slate-300"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={18} /><p>Akun dan CAPTCHA digunakan untuk masuk ke LMS. Informasi login tidak disimpan permanen; sesi hanya dipakai sementara untuk memuat data akademik dan dihapus saat kamu keluar.</p></div>
    {authenticated ? <button type="button" onClick={() => void syncData()} disabled={busy || dataReady} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={16} />}{dataReady ? "Data LMS siap" : "Sinkronkan data LMS"}</button> : <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Username<input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      <div className="flex items-end gap-3"><label className="block min-w-0 flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Jawaban CAPTCHA<input autoComplete="off" required value={captchaAnswer} onChange={(event) => setCaptchaAnswer(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><button type="button" onClick={() => void loadCaptcha()} disabled={busy} aria-label="Muat ulang CAPTCHA" title="Muat ulang CAPTCHA" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"><RefreshCw size={16} /></button></div>
      {captcha && <div className="flex min-h-16 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"><img src={captcha} alt="CAPTCHA login LMS" className="max-h-14 max-w-full object-contain" /></div>}
      <button type="submit" disabled={busy || !captcha} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <BookOpenCheck size={17} />}Login LMS</button>
    </form>}
    <p role="status" className="mt-4 min-h-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{message}</p>
  </>;
}
