import { Skeleton } from "@/components/ui/skeleton"
import { Users, User, CalendarX } from 'lucide-react'
import { cn } from "@/lib/utils"

export default function AvailabilityLoading() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="mb-8 p-6 bg-card/30 backdrop-blur-md rounded-3xl border border-white/5 shadow-sm">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-96 max-w-xl" />
      </div>

      {/* View Mode Toggle Skeleton */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex bg-secondary/40 backdrop-blur-md rounded-full p-1.5 border border-white/5 shadow-inner">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
        
        <div className="flex bg-secondary/40 backdrop-blur-md rounded-full p-1.5 border border-white/5 shadow-inner ml-auto">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Team Member List - Sidebar Skeleton */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            
            <div className="space-y-2 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>

            <Skeleton className="h-10 w-full rounded-xl mt-4" />
          </div>
        </div>

        {/* Main Content Area Skeleton */}
        <div className="flex-1 min-w-0">
          <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
            {/* Header of main area */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>

            {/* Schedule Rows */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>
              
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-secondary/10">
                    <Skeleton className="h-5 w-5 rounded-md shrink-0" />
                    <Skeleton className="h-5 w-24 shrink-0" />
                    <div className="hidden sm:block h-8 w-px bg-border/50 mx-2" />
                    <div className="flex-1 flex gap-2">
                      <Skeleton className="h-9 w-24 rounded-lg" />
                      <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end mt-8 pt-6 border-t border-border/50">
                <Skeleton className="h-10 w-40 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
