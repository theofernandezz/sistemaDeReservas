import { Skeleton } from "@/components/ui/skeleton"

export default function AppointmentsLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* Appointments list */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-border/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Date/time block */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 min-w-[5rem]">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-12 mt-1 hidden sm:block" />
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-10 bg-border/50 mx-2" />

              {/* Client info */}
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-44 max-w-[80%]" />
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              {/* Status + actions */}
              <div className="flex items-center gap-3 sm:justify-end">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
