import { SoftwareApplicationSchema } from '@/components/seo/structured-data'
import HomePage from './home-page'

export default function Page() {
  return (
    <>
      <SoftwareApplicationSchema />
      <HomePage />
    </>
  )
}
