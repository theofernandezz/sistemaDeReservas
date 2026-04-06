import { getSoloAvailability, getTeamMembers } from '@/app/actions/team'
import AvailabilityClient from './availability-client'

export default async function AvailabilityPage() {
  const [teamResultRaw, soloResultRaw] = await Promise.allSettled([
    getTeamMembers(),
    getSoloAvailability(),
  ])

  const teamMembers =
    teamResultRaw.status === 'fulfilled' &&
    teamResultRaw.value.success &&
    teamResultRaw.value.data
      ? teamResultRaw.value.data
      : []

  const soloAvailability =
    soloResultRaw.status === 'fulfilled' &&
    soloResultRaw.value.success &&
    soloResultRaw.value.data
      ? soloResultRaw.value.data
      : null

  return (
    <AvailabilityClient
      initialTeamMembers={teamMembers}
      initialSoloAvailability={soloAvailability}
    />
  )
}
