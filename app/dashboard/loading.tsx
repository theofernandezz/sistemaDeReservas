import { Skeleton } from "@/components/ui/skeleton"
import { CalendarCheck } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Asymmetric Grid Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Column: Agenda (70%) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck size={18} className="text-muted" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-5 w-40" />
          </div>

          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Time Column */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 min-w-20">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-4 w-12 mt-1 hidden sm:block" />
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px h-10 bg-border/50 mx-2" />

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-48 max-w-[80%]" />
                    <Skeleton className="h-4 w-32" />
                  </div>

                  {/* Status & Actions Column */}
                  <div className="flex items-center justify-between sm:justify-end mt-2 sm:mt-0">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column: Stats (30%) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {/* Stat 1 */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="col-span-2 lg:col-span-1 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
              {/* Progress bar */}
              <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
