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
      const createdMember = result.data
      setTeamMembers((prev) => [...prev, createdMember])
      setViewMode('team')
      return true
    }
    return false
  }

  const handleUpdateMember = useCallback(
    async (memberId: string, updates: Partial<TeamMember>) => {
      const result = await updateTeamMember(memberId, updates)
      if (result.success && result.data) {
        const updatedMember = result.data
        setTeamMembers((prev) =>
          prev.map((member) => (member.id === memberId ? updatedMember : member))
        )
      }
    },
    []
  )

  const handleToggleMemberStatus = useCallback(async (memberId: string) => {
    const result = await toggleTeamMemberStatus(memberId)
    if (result.success && result.data) {
      const updatedMember = result.data
      setTeamMembers((prev) =>
        prev.map((member) => (member.id === memberId ? updatedMember : member))
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
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Gestión de Disponibilidad
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          {viewMode === 'team'
            ? 'Configura los horarios y la disponibilidad diaria de cada miembro del equipo.'
            : 'Personaliza tus bloques de tiempo, define tus descansos y configura límites.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex bg-secondary rounded-lg p-1 border border-border">
          <button
            className={cn(
              'flex items-center gap-2 py-1.5 px-4 rounded-md text-sm font-medium transition-colors',
              activeTab === 'schedule'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
            onClick={() => setActiveTab('schedule')}
          >
            {viewMode === 'team' ? <Users size={15} /> : <User size={15} />}
            Horarios
          </button>
          <button
            className={cn(
              'flex items-center gap-2 py-1.5 px-4 rounded-md text-sm font-medium transition-colors',
              activeTab === 'blocked'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
            onClick={() => setActiveTab('blocked')}
          >
            <CalendarX size={15} />
            Bloquear Fechas
          </button>
        </div>

        {activeTab === 'schedule' && (
          <div className="flex bg-secondary rounded-lg p-1 border border-border ml-auto">
            <button
              className={cn(
                'flex items-center gap-2 py-1.5 px-4 rounded-md text-sm font-medium transition-colors',
                viewMode === 'solo'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
              onClick={() => setViewMode('solo')}
            >
              <User size={15} />
              Trabajo solo
            </button>
            <button
              className={cn(
                'flex items-center gap-2 py-1.5 px-4 rounded-md text-sm font-medium transition-colors',
                viewMode === 'team'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
              onClick={() => setViewMode('team')}
            >
              <Users size={15} />
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
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-72 shrink-0">
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
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Selecciona un miembro
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
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
