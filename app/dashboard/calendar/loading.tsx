import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-6 animate-in fade-in duration-500">
      {/* Top bar: month navigation + view toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full rounded" />
        ))}
      </div>

      {/* Calendar grid — 5 weeks */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 divide-x divide-border/50">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[80px] md:min-h-[100px] p-2 border-b border-border/50 space-y-1.5"
            >
              <Skeleton className="h-5 w-6 rounded" />
              {/* Random event slots to look natural */}
              {i % 5 === 0 && <Skeleton className="h-4 w-full rounded" />}
              {i % 7 === 2 && <Skeleton className="h-4 w-4/5 rounded" />}
              {i % 9 === 1 && <Skeleton className="h-4 w-3/5 rounded" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
