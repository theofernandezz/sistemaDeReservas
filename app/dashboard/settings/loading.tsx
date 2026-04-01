import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Page header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar navigation */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-2xl p-3 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <Skeleton className="h-4 flex-1 max-w-[120px]" />
              </div>
            ))}
          </div>
        </div>

        {/* Main content panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm space-y-8">
            {/* Section title */}
            <div className="pb-4 border-b border-border/50">
              <Skeleton className="h-6 w-40 mb-1.5" />
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Form fields — two columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>

            {/* Full-width field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>

            {/* Integration row (e.g. Google Calendar, MercadoPago) */}
            <div className="pt-4 border-t border-border/50 space-y-3">
              <Skeleton className="h-5 w-36 mb-3" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/10"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
              ))}
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-2 border-t border-border/50">
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
