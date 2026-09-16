import type { ReactNode } from 'react'
import { PageTransition } from '@/components/booking/page-transition'

export default function BookingStepsTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
