"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("ruangkelas-theme");
    const active = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(active);
    applyTheme(active ? "dark" : "light");
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("ruangkelas-theme", next ? "dark" : "light");
    applyTheme(next ? "dark" : "light");
  }
  return <button type="button" onClick={toggle} aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
}
