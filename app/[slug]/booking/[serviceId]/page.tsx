import { notFound, redirect } from 'next/navigation'
import { getServiceById } from '@/app/actions'
import { getActiveTeamMembersForBusiness } from '@/app/actions/team'
import { getBusinessBySlug } from '@/app/actions/auth'
import SpecialistSelector from '@/components/booking/specialist-selector'

interface PageProps {
  params: Promise<{ slug: string; serviceId: string }>
}

export default async function SpecialistSelectionPage({ params }: PageProps) {
  const { slug, serviceId } = await params

  // Fetch business to get businessId
  const businessResult = await getBusinessBySlug(slug)
  if (!businessResult.success || !businessResult.data) {
    notFound()
  }

  const business = businessResult.data

  // Fetch service to show info
  const serviceResult = await getServiceById(serviceId)
  if (!serviceResult.success || !serviceResult.data) {
    notFound()
  }

  const service = serviceResult.data

  // Fetch active team members
  const membersResult = await getActiveTeamMembersForBusiness(business.id)
  const members = (membersResult.success && membersResult.data) ? membersResult.data : []

  // If no team members → skip specialist step, go straight to calendar with "any"
  if (members.length === 0) {
    redirect(`/${slug}/booking/${serviceId}/calendar?member=any`)
  }

  const accentColor = business.settings?.accentColor || '#f97316'

  return (
    <SpecialistSelector
      slug={slug}
      serviceId={serviceId}
      serviceName={service.name}
      members={members}
      accentColor={accentColor}
    />
  )
}
