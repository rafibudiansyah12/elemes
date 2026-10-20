export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800 ${className}`} />;
}

export function PageSkeleton() {
  return <div className="space-y-6"><SkeletonBlock className="h-8 w-56" /><SkeletonBlock className="h-20 w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="h-28" />)}</div><div className="grid gap-4 lg:grid-cols-2"><SkeletonBlock className="h-72" /><SkeletonBlock className="h-72" /></div></div>;
}
