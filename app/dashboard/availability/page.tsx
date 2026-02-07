'use client'

import { useState, useEffect, useCallback } from 'react'
import { TeamMember, CreateTeamMemberInput, WeeklySchedule } from '@/types/database.types'
import TeamMemberList from '@/components/availability/team-member-list'
import TeamConsolidatedView from '@/components/availability/team-consolidated-view'
import MemberScheduleEditor from '@/components/availability/member-schedule-editor'
import SoloAvailabilityEditor from '@/components/availability/solo-availability-editor'
import TeamMemberModal from '@/components/availability/team-member-modal'
import TeamManagementModal from '@/components/availability/team-management-modal'
import BlockedDatesManager from '@/components/admin/blocked-dates-manager'
import { 
  getTeamMembers, 
  createTeamMember, 
  updateTeamMember, 
  toggleTeamMemberStatus,
  getSoloAvailability,
  saveSoloAvailability 
} from '@/app/actions/team'
import { Loader2, Users, User, CalendarX } from 'lucide-react'

// Default weekly schedule
const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  '0': { isOpen: false, startTime: '10:00', endTime: '14:00', breaks: [] },
  '1': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '2': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '3': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '4': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '5': { isOpen: true, startTime: '09:00', endTime: '18:00', breaks: [{ name: 'Almuerzo', start: '13:00', end: '14:00' }] },
  '6': { isOpen: true, startTime: '10:00', endTime: '14:00', breaks: [] },
}

type ViewMode = 'solo' | 'team'
type ActiveTab = 'schedule' | 'blocked'

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('solo')
  const [activeTab, setActiveTab] = useState<ActiveTab>('schedule')
  
  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  
  // Solo availability state
  const [soloSchedule, setSoloSchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE)
  const [soloInterval, setSoloInterval] = useState(30)
  const [soloBuffer, setSoloBuffer] = useState(0)

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      // Load team members
      const teamResult = await getTeamMembers()
      if (teamResult.success && teamResult.data) {
        setTeamMembers(teamResult.data)
        // If there are team members, default to team view
        if (teamResult.data.length > 0) {
          setViewMode('team')
        }
      }
      
      // Load solo availability
      const soloResult = await getSoloAvailability()
      if (soloResult.success && soloResult.data) {
        setSoloSchedule(soloResult.data.schedule)
        setSoloInterval(soloResult.data.interval)
        setSoloBuffer(soloResult.data.buffer)
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [])

  // Handlers
  const handleAddMember = async (input: CreateTeamMemberInput): Promise<boolean> => {
    const result = await createTeamMember(input)
    if (result.success && result.data) {
      setTeamMembers(prev => [...prev, result.data!])
      setViewMode('team')
      return true
    }
    return false
  }

  const handleUpdateMember = useCallback(async (memberId: string, updates: Partial<TeamMember>) => {
    const result = await updateTeamMember(memberId, updates)
    if (result.success && result.data) {
      setTeamMembers(prev => prev.map(m => m.id === memberId ? result.data! : m))
    }
  }, [])

  const handleToggleMemberStatus = useCallback(async (memberId: string) => {
    const result = await toggleTeamMemberStatus(memberId)
    if (result.success && result.data) {
      setTeamMembers(prev => prev.map(m => m.id === memberId ? result.data! : m))
    }
  }, [])

  const handleSaveSoloAvailability = async (data: { schedule: WeeklySchedule; interval: number; buffer: number }): Promise<boolean> => {
    const result = await saveSoloAvailability(data)
    if (result.success) {
      setSoloSchedule(data.schedule)
      setSoloInterval(data.interval)
      setSoloBuffer(data.buffer)
    }
    return result.success
  }

  const selectedMember = selectedMemberId 
    ? teamMembers.find(m => m.id === selectedMemberId) 
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100 p-6 md:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Disponibilidad</h1>
        <p className="text-sm text-muted-foreground">
          {viewMode === 'team' 
            ? 'Configura los horarios de cada miembro del equipo'
            : 'Configura tus horarios de atención y bloquea fechas específicas'
          }
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Main Tabs */}
        <div className="flex bg-secondary/30 rounded-xl p-1.5">
          <button
            className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'schedule' 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('schedule')}
          >
            {viewMode === 'team' ? <Users size={16} /> : <User size={16} />}
            Horarios
          </button>
          <button
            className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'blocked' 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('blocked')}
          >
            <CalendarX size={16} />
            Bloquear Fechas
          </button>
        </div>

        {/* View Mode Toggle */}
        {activeTab === 'schedule' && (
          <div className="flex bg-secondary/30 rounded-xl p-1.5">
            <button
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'solo' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('solo')}
            >
              <User size={16} />
              Trabajo solo
            </button>
            <button
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'team' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('team')}
            >
              <Users size={16} />
              Tengo equipo
            </button>
          </div>
        )}
      </div>

      {/* Content */}
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
          {/* Team Member List - Sidebar */}
          <div className="lg:w-80 shrink-0">
            <TeamMemberList
              members={teamMembers}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onAddMember={() => setShowAddMemberModal(true)}
              onManageTeam={() => setShowManageModal(true)}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {selectedMemberId === null ? (
              // Consolidated Team View
              <TeamConsolidatedView members={teamMembers} />
            ) : selectedMember ? (
              // Individual Member Editor
              <MemberScheduleEditor
                member={selectedMember}
                memberIndex={teamMembers.findIndex(m => m.id === selectedMemberId)}
                onUpdate={handleUpdateMember}
                onToggleStatus={handleToggleMemberStatus}
              />
            ) : (
              // Empty state
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">Selecciona un miembro</h3>
                <p className="text-sm text-muted-foreground">
                  Elige un miembro del equipo para configurar sus horarios
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <TeamMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSave={handleAddMember}
      />

      {/* Team Management Modal */}
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
