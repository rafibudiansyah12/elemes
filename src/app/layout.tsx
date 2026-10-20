import type { Metadata } from "next";
import { AppShell } from "@/components/navigation";
import { LoginGate } from "@/components/login-gate";
import { getDataUpdatedAt, getLocalLmsStatus, getProfil } from "@/lib/data";
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
  if (!session.authenticated || !session.dataReady) {
    return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><LoginGate localMode={localMode} authenticated={session.authenticated} dataReady={session.dataReady} /></body></html>;
  }
  const profile = await getProfil();
  const updatedAt = await getDataUpdatedAt();
  return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><AppShell profileName={profile.nama} localMode={localMode} updatedAt={updatedAt}>{children}</AppShell></body></html>;
}
