'use client'

import { useCallback, useState } from 'react'
import { CalendarX, User, Users } from 'lucide-react'
import TeamMemberList from '@/components/availability/team-member-list'
import TeamConsolidatedView from '@/components/availability/team-consolidated-view'
import MemberScheduleEditor from '@/components/availability/member-schedule-editor'
import SoloAvailabilityEditor from '@/components/availability/solo-availability-editor'
import TeamMemberModal from '@/components/availability/team-member-modal'
import TeamManagementModal from '@/components/availability/team-management-modal'
import BlockedDatesManager from '@/components/admin/blocked-dates-manager'
import {
  createTeamMember,
  saveSoloAvailability,
  toggleTeamMemberStatus,
  updateTeamMember,
} from '@/app/actions/team'
import { cn } from '@/lib/utils'
import type {
  CreateTeamMemberInput,
  TeamMember,
  WeeklySchedule,
} from '@/types/database.types'

const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  '0': { isOpen: false, startTime: '10:00', endTime: '14:00', breaks: [] },
  '1': {
    isOpen: true,
    startTime: '09:00',
    endTime: '18:00',
    breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }],
  },
  '2': {
    isOpen: true,
    startTime: '09:00',
    endTime: '18:00',
    breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }],
  },
  '3': {
    isOpen: true,
    startTime: '09:00',
    endTime: '18:00',
    breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }],
  },
  '4': {
    isOpen: true,
    startTime: '09:00',
    endTime: '18:00',
    breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }],
  },
  '5': {
    isOpen: true,
    startTime: '09:00',
    endTime: '18:00',
    breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }],
  },
  '6': { isOpen: true, startTime: '10:00', endTime: '14:00', breaks: [] },
}

type ViewMode = 'solo' | 'team'
type ActiveTab = 'schedule' | 'blocked'

interface InitialSoloAvailability {
  schedule: WeeklySchedule
  interval: number
  buffer: number
}

interface AvailabilityClientProps {
  initialTeamMembers: TeamMember[]
  initialSoloAvailability: InitialSoloAvailability | null
}

export default function AvailabilityClient({
  initialTeamMembers,
  initialSoloAvailability,
}: AvailabilityClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialTeamMembers.length > 0 ? 'team' : 'solo'
  )
  const [activeTab, setActiveTab] = useState<ActiveTab>('schedule')

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)

  const [soloSchedule, setSoloSchedule] = useState<WeeklySchedule>(
    initialSoloAvailability?.schedule ?? DEFAULT_WEEKLY_SCHEDULE
  )
  const [soloInterval, setSoloInterval] = useState<number>(
    initialSoloAvailability?.interval ?? 30
  )
  const [soloBuffer, setSoloBuffer] = useState<number>(
    initialSoloAvailability?.buffer ?? 0
  )

  const handleAddMember = async (
    input: CreateTeamMemberInput
  ): Promise<boolean> => {
    const result = await createTeamMember(input)
    if (result.success && result.data) {
      setTeamMembers((prev) => [...prev, result.data])
      setViewMode('team')
      return true
    }
    return false
  }

  const handleUpdateMember = useCallback(
    async (memberId: string, updates: Partial<TeamMember>) => {
      const result = await updateTeamMember(memberId, updates)
      if (result.success && result.data) {
        setTeamMembers((prev) =>
          prev.map((member) => (member.id === memberId ? result.data : member))
        )
      }
    },
    []
  )

  const handleToggleMemberStatus = useCallback(async (memberId: string) => {
    const result = await toggleTeamMemberStatus(memberId)
    if (result.success && result.data) {
      setTeamMembers((prev) =>
        prev.map((member) => (member.id === memberId ? result.data : member))
      )
    }
  }, [])

  const handleSaveSoloAvailability = async (data: {
    schedule: WeeklySchedule
    interval: number
    buffer: number
  }): Promise<boolean> => {
    const result = await saveSoloAvailability(data)
    if (result.success) {
      setSoloSchedule(data.schedule)
      setSoloInterval(data.interval)
      setSoloBuffer(data.buffer)
    }
    return result.success
  }

  const selectedMember = selectedMemberId
    ? teamMembers.find((member) => member.id === selectedMemberId)
    : null

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8 p-6 bg-card/30 backdrop-blur-md rounded-3xl border border-white/5 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gestión de Disponibilidad
        </h1>
        <p className="text-sm text-muted-foreground/80 mt-1 max-w-xl">
          {viewMode === 'team'
            ? 'Configura los horarios y la disponibilidad diaria de cada miembro del equipo.'
            : 'Personaliza tus bloques de tiempo, define tus descansos y configura límites.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex bg-secondary/40 backdrop-blur-md rounded-full p-1.5 border border-white/5 shadow-inner">
          <button
            className={cn(
              'flex items-center gap-2 py-2 px-5 rounded-full text-sm font-semibold transition-all duration-300',
              activeTab === 'schedule'
                ? 'bg-background shadow-md text-foreground scale-100'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/50 scale-95 hover:scale-100'
            )}
            onClick={() => setActiveTab('schedule')}
          >
            {viewMode === 'team' ? <Users size={16} /> : <User size={16} />}
            Horarios
          </button>
          <button
            className={cn(
              'flex items-center gap-2 py-2 px-5 rounded-full text-sm font-semibold transition-all duration-300',
              activeTab === 'blocked'
                ? 'bg-background shadow-md text-foreground scale-100'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/50 scale-95 hover:scale-100'
            )}
            onClick={() => setActiveTab('blocked')}
          >
            <CalendarX size={16} />
            Bloquear Fechas
          </button>
        </div>

        {activeTab === 'schedule' && (
          <div className="flex bg-secondary/40 backdrop-blur-md rounded-full p-1.5 border border-white/5 shadow-inner ml-auto">
            <button
              className={cn(
                'flex items-center gap-2 py-2 px-5 rounded-full text-sm font-semibold transition-all duration-300',
                viewMode === 'solo'
                  ? 'bg-background shadow-md text-foreground scale-100'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/50 scale-95 hover:scale-100'
              )}
              onClick={() => setViewMode('solo')}
            >
              <User size={16} />
              Trabajo solo
            </button>
            <button
              className={cn(
                'flex items-center gap-2 py-2 px-5 rounded-full text-sm font-semibold transition-all duration-300',
                viewMode === 'team'
                  ? 'bg-background shadow-md text-foreground scale-100'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/50 scale-95 hover:scale-100'
              )}
              onClick={() => setViewMode('team')}
            >
              <Users size={16} />
              Tengo equipo
            </button>
          </div>
        )}
      </div>

      {activeTab === 'blocked' ? (
        <BlockedDatesManager />
      ) : viewMode === 'solo' ? (
        <SoloAvailabilityEditor
          initialSchedule={soloSchedule}
          initialInterval={soloInterval}
          initialBuffer={soloBuffer}
          onSave={handleSaveSoloAvailability}
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-80 shrink-0">
            <TeamMemberList
              members={teamMembers}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onAddMember={() => setShowAddMemberModal(true)}
              onManageTeam={() => setShowManageModal(true)}
            />
          </div>

          <div className="flex-1 min-w-0">
            {selectedMemberId === null ? (
              <TeamConsolidatedView members={teamMembers} />
            ) : selectedMember ? (
              <MemberScheduleEditor
                member={selectedMember}
                memberIndex={teamMembers.findIndex(
                  (member) => member.id === selectedMemberId
                )}
                onUpdate={handleUpdateMember}
                onToggleStatus={handleToggleMemberStatus}
              />
            ) : (
              <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-3xl p-16 text-center shadow-sm">
                <div className="h-20 w-20 rounded-full bg-secondary/50 border border-border/50 mx-auto mb-6 flex items-center justify-center shadow-inner">
                  <Users className="h-10 w-10 text-muted-foreground/70" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                  Selecciona un miembro
                </h3>
                <p className="text-muted-foreground/80 max-w-sm mx-auto">
                  Elige un miembro del equipo del panel lateral para configurar
                  sus días de trabajo y horarios.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <TeamMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSave={handleAddMember}
      />

      {showManageModal && (
        <TeamManagementModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          members={teamMembers}
          onUpdateMembers={setTeamMembers}
        />
      )}
    </div>
  )
}