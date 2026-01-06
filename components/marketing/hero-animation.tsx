'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Clock, MapPin, MousePointer2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HeroAnimation() {
  const [step, setStep] = useState(0) // 0: select-date, 1: select-time, 2: form, 3: success
  const [cursorPos, setCursorPos] = useState({ x: 10, y: 10 })
  const [isClicking, setIsClicking] = useState(false)

  // Animation loop implemented in the second useEffect


  useEffect(() => {
    let mounted = true

    const runAnimation = async () => {
      while (mounted) {
        setStep(0)
        setCursorPos({ x: 10, y: 10 })

        await wait(1000)

        // 1. Move to Date (Day 19: Row 3, Col 5 -> approx x:65%, y:55% relative to grid container, adjusted for full view)
        // Global coordinates relative to container:
        // Day 19 is approx at x: 68%, y: 48% inside the dynamic area
        await animateCursorTo(setCursorPos, { x: 10, y: 10 }, { x: 68, y: 42 }, 1000)
        setIsClicking(true)
        await wait(150)
        setIsClicking(false)
        await wait(500)

        // 2. Move to Time Slot (09:00: Row 1, Col 1 -> approx x:16%, y:something)
        // 09:00 is first item. x: 16% of container? No, inside dynamic area grid cols 3.
        // Approx x: 20%, y: 75%
        await animateCursorTo(setCursorPos, { x: 68, y: 42 }, { x: 20, y: 68 }, 800)
        setIsClicking(true)
        await wait(150)
        setIsClicking(false)
        setStep(2) // Show form
        await wait(600)

        // 3. Move to Confirm Button (Bottom Right)
        // Approx x: 80%, y: 85%
        await animateCursorTo(setCursorPos, { x: 20, y: 68 }, { x: 82, y: 82 }, 1200)
        setIsClicking(true)
        await wait(150)
        setIsClicking(false)
        setStep(3) // Success

        await wait(4000)
      }
    }

    runAnimation()
    return () => { mounted = false }
  }, [])



  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[4/3] md:aspect-[16/9] bg-background rounded-xl border shadow-2xl overflow-hidden select-none">
      {/* Browser Bar */}
      <div className="h-8 border-b bg-muted/40 flex items-center px-3 gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <div className="flex-1 text-[10px] text-center text-muted-foreground font-medium bg-background/50 mx-4 rounded-md py-0.5">
          reserva.com/sofia-design
        </div>
      </div>

      {/* Content */}
      <div className="flex h-full p-4 md:p-6 gap-6">
        {/* Sidebar */}
        <div className="w-1/3 border-r pr-6 hidden sm:block">
          <div className="w-10 h-10 rounded-full bg-zinc-800 mb-4" />
          <h3 className="font-semibold text-sm">Sofía Design</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Consultoría de Diseño UX/UI</p>

          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              30 min
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Google Meet
            </div>
          </div>
        </div>

        {/* Dynamic Area */}
        <div className="flex-1 relative">
          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h4 className="font-semibold mb-3 text-sm">Selecciona un día</h4>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-2">
                <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs font-medium">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-md text-sm",
                      i === 18 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted text-muted-foreground",
                      i < 15 && "opacity-30 pointer-events-none"
                    )}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <h4 className="font-semibold mt-4 mb-2 text-sm">Horarios disponibles</h4>
              <div className="grid grid-cols-3 gap-2">
                {['09:00', '10:00', '11:00', '14:00', '15:30', '16:00'].map((time, i) => (
                  <div key={time} className={cn(
                    "border rounded-md py-1.5 px-2 text-center text-xs font-medium transition-colors",
                    time === '09:00' && step >= 0 ? "border-primary text-primary bg-primary/5" : "hover:border-primary/50"
                  )}>
                    {time}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-3">
              <div className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded-md mb-2 -ml-1 cursor-pointer w-fit text-xs text-muted-foreground">
                <ChevronLeft className="w-3 h-3" /> Atrás
              </div>
              <h4 className="font-semibold text-sm">Ingresa tus datos</h4>
              <div className="space-y-2">
                <div className="h-8 w-full bg-muted/30 rounded-md border px-3 flex items-center text-xs">Juan Pérez</div>
                <div className="h-8 w-full bg-muted/30 rounded-md border px-3 flex items-center text-xs">juan@ejemplo.com</div>
                <div className="h-16 w-full bg-muted/30 rounded-md border p-2 text-xs text-muted-foreground">Notas adicionales...</div>
              </div>
              <div className="pt-2 flex justify-end">
                <div className="h-8 px-4 bg-primary text-primary-foreground rounded-md text-xs font-medium flex items-center shadow-lg shadow-primary/20 transform scale-100 transition-transform">
                  Confirmar Reserva
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-50 duration-500">
              <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center mb-3 shadow-xl shadow-green-500/30">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base">¡Reserva Confirmada!</h3>
              <p className="text-xs text-muted-foreground mt-1">Te hemos enviado un email con los detalles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Cursor */}
      <div
        className={cn(
          "absolute pointer-events-none transition-transform duration-75 z-50",
          isClicking && "scale-90"
        )}
        style={{
          left: `${cursorPos.x}%`,
          top: `${cursorPos.y}%`,
          marginLeft: '-3px',
          marginTop: '-2px'
        }}
      >
        <MousePointer2 className="w-5 h-5 fill-black stroke-white text-black drop-shadow-md" />
      </div>
    </div>
  )
}

// Helpers
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

// Smoothly interpolate cursor position
const animateCursorTo = async (
  setCursor: (pos: { x: number, y: number }) => void,
  start: { x: number, y: number },
  end: { x: number, y: number },
  duration: number
) => {
  const steps = 60
  const delay = duration / steps

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // Ease out cubic
    const ease = 1 - Math.pow(1 - t, 3)

    setCursor({
      x: start.x + (end.x - start.x) * ease,
      y: start.y + (end.y - start.y) * ease
    })
    await wait(delay)
  }
}
