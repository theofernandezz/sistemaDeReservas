import { Loader2 } from "lucide-react"

export default function AdminLoading() {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center text-muted-foreground animate-in fade-in zoom-in-95 duration-300 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">Cargando panel...</p>
    </div>
  )
}
