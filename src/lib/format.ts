import type { Tugas } from "@/types/lms";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
});
const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta",
});

export function formatDate(value: string): string {
  const date = new Date(value);
  const time = Object.fromEntries(timeFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${dateFormatter.format(date)}, ${time.hour}:${time.minute}`;
}

export function relativeDeadline(deadline: string, now = new Date()): string {
  const diff = new Date(deadline).getTime() - now.getTime();
  if (diff < 0) return "Tenggat terlewat";
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(diff / 3_600_000);
    return hours === 0 ? "Kurang dari 1 jam" : `${hours} jam lagi`;
  }
  return `${days} hari lagi`;
}

export function isUrgent(task: Tugas, now = new Date()): boolean {
  const remaining = new Date(task.deadline).getTime() - now.getTime();
  return task.status === "belum" && remaining >= 0 && remaining < 86_400_000;
}

export function getGreeting(hour = new Date().getHours()): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function todayName(date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(date);
}
