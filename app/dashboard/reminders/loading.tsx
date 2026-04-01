import { Skeleton } from "@/components/ui/skeleton"

export default function RemindersLoading() {
  return (
    <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        {/* Badge placeholder */}
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>

      {/* Pending approvals section */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        {/* Section header */}
        <div className="p-4 md:p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>

        {/* Pending appointment rows */}
        <div className="divide-y divide-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Time */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 min-w-[5rem]">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-14 mt-1 hidden sm:block" />
              </div>

              <div className="hidden sm:block w-px h-10 bg-border/50 mx-2" />

              {/* Client + service */}
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-40 max-w-[80%]" />
                <Skeleton className="h-4 w-28" />
              </div>

              {/* Approve / reject actions */}
              <div className="flex items-center gap-2 sm:justify-end">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp reminders panel */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        {/* Panel header */}
        <div className="p-4 md:p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Reminder rows */}
        <div className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-44 max-w-[80%]" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
