import type { Metadata } from "next";
import { AppShell } from "@/components/navigation";
import { LoginGate } from "@/components/login-gate";
import { getDataUpdatedAt, getLocalLmsStatus, getMatkul, getProfil } from "@/lib/data";
import { getCurrentRelaySession } from "@/scraper/relay-session";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "RuangKelas | Portal Akademik", template: "%s | RuangKelas" },
  description: "Dashboard akademik RuangKelas untuk mengelola mata kuliah, tugas, dan jadwal.",
  applicationName: "RuangKelas",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const localMode = process.env.NODE_ENV !== "production";
  const relaySession = localMode ? undefined : await getCurrentRelaySession();
  const session = localMode
    ? await getLocalLmsStatus()
    : { authenticated: Boolean(relaySession?.authenticated), dataReady: Boolean(relaySession?.authenticated && relaySession.data) };
  const themeScript = `try{const t=localStorage.getItem('ruangkelas-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch{}`;
  // Di mode online, sesi yang sudah login boleh masuk dulu; shell menampilkan skeleton saat data dimuat.
  if (!session.authenticated || (localMode && !session.dataReady)) {
    return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><LoginGate localMode={localMode} authenticated={session.authenticated} dataReady={session.dataReady} /></body></html>;
  }
  const [profile, courses, updatedAt] = await Promise.all([getProfil(), getMatkul(), getDataUpdatedAt()]);
  const semester = profile.semester || courses.find((course) => course.semester)?.semester || 0;
  return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><AppShell profileName={profile.nama} semester={semester} localMode={localMode} updatedAt={updatedAt} dataReady={session.dataReady}>{children}</AppShell></body></html>;
}
