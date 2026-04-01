import { Skeleton } from "@/components/ui/skeleton"

export default function ServicesLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Tabs: Services / Addons */}
      <div className="flex gap-1 border-b border-border/50 mb-6">
        <Skeleton className="h-10 w-28 rounded-t-lg" />
        <Skeleton className="h-10 w-28 rounded-t-lg" />
      </div>

      {/* Section header + add button */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Service cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm"
          >
            {/* Image area */}
            <Skeleton className="h-40 w-full rounded-none" />

            <div className="p-4 space-y-3">
              {/* Title + toggle */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>

              {/* Duration + price */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
