"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle } from "lucide-react";

// Mulai sinkronisasi setelah dashboard tampil, lalu pantau cache tanpa menahan navigasi.
export function LmsSyncOnboarding({ dataReady, syncState, syncMessage }: { dataReady: boolean; syncState: string | null; syncMessage: string | null }) {
  const router = useRouter();
  const started = useRef(false);
  const initiallyReady = useRef(dataReady);
  const [message, setMessage] = useState(syncMessage || "Menyiapkan data LMS untuk dashboard...");
  const [failed, setFailed] = useState(syncState === "error");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let stopped = false;
    let lastRevision = -1;

    const poll = window.setInterval(async () => {
      try {
        const response = await fetch("/api/lms/session", { cache: "no-store" });
        if (!response.ok) return;
        const status = await response.json() as { authenticated?: boolean; dataReady?: boolean; syncState?: string | null; syncMessage?: string | null; dataRevision?: number };
        if (status.syncState === "error" && status.syncMessage) {
          setFailed(true);
          setMessage(status.syncMessage);
        }
        if (!status.authenticated) {
          window.location.assign("/");
          return;
        }
        if (status.dataReady && status.dataRevision !== lastRevision && !stopped) {
          lastRevision = status.dataRevision ?? 0;
          router.refresh();
        }
        if (status.dataReady && status.syncState !== "running" && !stopped) {
          window.clearInterval(poll);
          if (status.dataRevision === lastRevision) router.refresh();
        }
      } catch {
        // Poll berikutnya mencoba kembali tanpa mengganggu tampilan.
      }
    }, 2000);

    if (!initiallyReady.current) void fetch("/api/lms/data", { method: "POST", cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Sinkronisasi membutuhkan waktu lebih lama dari biasanya.");
      if (!stopped) router.refresh();
    }).catch((error: unknown) => {
      if (stopped) return;
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Sinkronisasi gagal. Coba muat ulang halaman.");
    });

    return () => {
      stopped = true;
      window.clearInterval(poll);
    };
  }, []);

  if (dataReady && !failed) return <div role="status" className="mb-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><LoaderCircle size={14} className="animate-spin text-blue-600" /> Data kelas tampil; detail tugas dan materi sedang disiapkan di latar belakang.</div>;
  return <div role="status" className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-sm ${failed ? "border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" : "border-blue-200/80 bg-blue-50/70 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200"}`}>
    {failed ? <AlertCircle size={19} className="shrink-0" /> : <LoaderCircle size={19} className="shrink-0 animate-spin" />}
    <span>{message}</span>
    {failed && <button className="ml-auto shrink-0 font-semibold underline underline-offset-4" onClick={async () => {
      setFailed(false);
      setMessage("Mencoba membaca ulang data LMS...");
      try {
        const response = await fetch("/api/lms/data", { method: "POST", cache: "no-store" });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Sinkronisasi gagal.");
        router.refresh();
      } catch (error) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "Sinkronisasi gagal. Coba lagi.");
      }
    }}>Coba lagi</button>}
  </div>;
}
