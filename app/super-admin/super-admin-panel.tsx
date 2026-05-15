'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveBusiness } from '@/app/actions/auth'
import { getSuperAdminBusinessDetails, SuperAdminBusinessDetails } from '@/app/actions/super-admin'
import { Button } from '@/components/ui/button'
import { Building2, ExternalLink, LogOut, Calendar, Plus, Settings, Loader2 } from 'lucide-react'
import { CreateBusinessForm } from './create-business-form'
import { BusinessEditor } from './business-editor'

interface Business {
  id: string
  name: string
  slug: string
  created_at: string
  owner_id: string
}

interface SuperAdminPanelProps {
  businesses: Business[]
  userEmail: string
}

type View = 'list' | 'create' | 'manage'

export function SuperAdminPanel({ businesses: initialBusinesses, userEmail }: SuperAdminPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingBusinessId, setLoadingBusinessId] = useState<string | null>(null)
  const router = useRouter()

  const [view, setView] = useState<View>('list')
  const [businesses, setBusinesses] = useState(initialBusinesses)
  const [managingDetails, setManagingDetails] = useState<SuperAdminBusinessDetails | null>(null)

  const handleVisit = (businessId: string) => {
    startTransition(async () => {
      await setActiveBusiness(businessId)
      router.push('/dashboard')
    })
  }

  const handleManage = (businessId: string) => {
    setLoadingBusinessId(businessId)
    startTransition(async () => {
      const result = await getSuperAdminBusinessDetails(businessId)
      setLoadingBusinessId(null)
      if (result.success && result.data) {
        setManagingDetails(result.data)
        setView('manage')
      }
    })
  }

  const handleCreated = (businessId: string) => {
    // After creating, go directly to the editor
    handleManage(businessId)
  }

  const handleBackToList = () => {
    // Refresh the page to get updated business list
    router.refresh()
    setManagingDetails(null)
    setView('list')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white text-black rounded-xl mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Panel de Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">{userEmail}</p>
        </div>

        {/* Views */}
        {view === 'list' && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-400">
                  Negocios registrados ({businesses.length})
                </h2>
                <Button
                  onClick={() => setView('create')}
                  size="sm"
                  className="bg-white text-black hover:bg-zinc-200 font-medium h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Nuevo
                </Button>
              </div>

              <div className="divide-y divide-zinc-800">
                {businesses.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    No hay negocios registrados
                  </div>
                ) : (
                  businesses.map((business) => (
                    <div
                      key={business.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-medium truncate">{business.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-zinc-500 text-sm">/{business.slug}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500 text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(business.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/${business.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                          title="Ver página pública"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleManage(business.id)}
                          disabled={loadingBusinessId === business.id}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                          title="Gestionar"
                        >
                          {loadingBusinessId === business.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Settings className="w-4 h-4" />
                          }
                        </button>
                        <Button
                          onClick={() => handleVisit(business.id)}
                          disabled={isPending}
                          className="bg-white text-black hover:bg-zinc-200 font-medium"
                          size="sm"
                        >
                          Visitar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 text-zinc-400 hover:text-white transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        )}

        {view === 'create' && (
          <CreateBusinessForm
            onBack={() => setView('list')}
            onCreated={handleCreated}
          />
        )}

        {view === 'manage' && managingDetails && (
          <BusinessEditor
            details={managingDetails}
            onBack={handleBackToList}
          />
        )}
      </div>
    </div>
  )
}
