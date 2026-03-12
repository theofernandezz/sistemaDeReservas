'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, User, ChevronRight } from 'lucide-react'
import { TeamMember } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface SpecialistSelectorProps {
  slug: string
  serviceId: string
  serviceName: string
  members: TeamMember[]
  accentColor: string
}

export default function SpecialistSelector({
  slug,
  serviceId,
  serviceName,
  members,
  accentColor,
}: SpecialistSelectorProps) {
  const router = useRouter()

  const calendarPath = (memberId: string) =>
    `/${slug}/booking/${serviceId}/calendar?member=${memberId}`

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 hover:bg-secondary rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{serviceName}</h1>
            <p className="text-xs text-muted-foreground">Elegí un especialista</p>
          </div>
          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
            Paso 1 de 3
          </span>
        </header>

        <div className="flex-1 p-4 space-y-3">
          {/* No preference option */}
          <button
            onClick={() => router.push(calendarPath('any'))}
            className={cn(
              'w-full p-4 rounded-2xl border-2 border-border/60 bg-card',
              'flex items-center gap-4 text-left',
              'transition-all duration-200 hover:border-primary/40 hover:bg-secondary/30 active:scale-[0.98]'
            )}
          >
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-base"
              style={{ backgroundColor: accentColor }}
            >
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base">Sin preferencia</p>
              <p className="text-sm text-muted-foreground">Primer turno disponible</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground">o elegí</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Team members */}
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              accentColor={accentColor}
              onClick={() => router.push(calendarPath(member.id))}
            />
          ))}
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="w-full max-w-[1400px] mx-auto px-12 py-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reserva</p>
              <h2 className="text-3xl font-bold tracking-tight">Elegí tu especialista</h2>
            </div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/80 text-muted-foreground">
              Paso 1 de 3
            </span>
          </div>

          <div className="w-full bg-card/60 rounded-3xl shadow-2xl shadow-black/10 overflow-hidden border border-border/50 backdrop-blur-sm p-10">
            <button
              onClick={() => router.back()}
              className={cn(
                'flex items-center gap-2 text-muted-foreground rounded-lg px-2 py-1 -ml-2 mb-8 text-sm',
                'transition-all duration-200 hover:text-foreground hover:bg-secondary/80 hover:-translate-x-1'
              )}
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>

            <p className="text-sm text-muted-foreground mb-6">
              Servicio: <span className="font-medium text-foreground">{serviceName}</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* No preference */}
              <button
                onClick={() => router.push(calendarPath('any'))}
                className={cn(
                  'p-6 rounded-2xl border-2 border-dashed border-border/60 bg-card/50',
                  'flex flex-col items-center gap-4 text-center',
                  'transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]'
                )}
              >
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-semibold text-base">Sin preferencia</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Primer turno disponible</p>
                </div>
              </button>

              {/* Members */}
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => router.push(calendarPath(member.id))}
                  className={cn(
                    'p-6 rounded-2xl border-2 border-border/60 bg-card/50',
                    'flex flex-col items-center gap-4 text-center',
                    'transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]'
                  )}
                >
                  <div
                    className={cn(
                      'h-16 w-16 rounded-2xl flex items-center justify-center',
                      'text-white font-bold text-xl shadow-sm',
                      member.avatar_color
                    )}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-base">{member.name}</p>
                    {member.role && (
                      <p className="text-sm text-muted-foreground mt-0.5">{member.role}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MemberCard({
  member,
  accentColor,
  onClick,
}: {
  member: TeamMember
  accentColor: string
  onClick: () => void
}) {
  void accentColor
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-2xl border-2 border-border/60 bg-card',
        'flex items-center gap-4 text-left',
        'transition-all duration-200 hover:border-primary/40 hover:bg-secondary/30 active:scale-[0.98]'
      )}
    >
      <div
        className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
          'text-white font-bold text-base',
          member.avatar_color
        )}
      >
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base">{member.name}</p>
        {member.role && <p className="text-sm text-muted-foreground">{member.role}</p>}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </button>
  )
}
