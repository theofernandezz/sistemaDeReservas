import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 animate-in fade-in duration-300">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <span className="sr-only">Cargando...</span>
    </div>
  )
}
