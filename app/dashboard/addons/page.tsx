import { getAllServiceAddons } from '@/app/actions'
import AddonManager from '@/components/admin/addon-manager'

export const dynamic = 'force-dynamic'

export default async function AddonsPage() {
  const result = await getAllServiceAddons()
  const addons = result.success ? result.data || [] : []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add-ons</h2>
        <p className="text-muted-foreground text-sm">
          Servicios adicionales que los clientes pueden agregar a sus citas
        </p>
      </div>

      <AddonManager initialAddons={addons} />
    </div>
  )
}
