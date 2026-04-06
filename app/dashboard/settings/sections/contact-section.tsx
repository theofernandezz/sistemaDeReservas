import { useState } from 'react'
import { AtSign, Globe, Loader2, Phone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateBusiness } from '@/app/actions'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SettingsProps } from '../settings-types'

interface ContactSectionProps {
  business?: SettingsProps['business']
}

export function ContactSection({ business }: ContactSectionProps) {
  const [phone, setPhone] = useState(business?.phone || '')
  const [email, setEmail] = useState(business?.email || '')
  const [instagram, setInstagram] = useState(business?.instagram || '')
  const [address, setAddress] = useState(business?.address || '')
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateBusiness({
        phone: phone || null,
        email: email || null,
        instagram: instagram || null,
        address: address || null,
      })
      if (result.success) {
        showSuccess('Guardado', 'Información de contacto actualizada')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo guardar')
      }
    } catch {
      showError('Error', 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Teléfono / WhatsApp</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+54 11 1234-5678"
            className="pl-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Email del negocio</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="contacto@minegocio.com"
            className="pl-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Instagram</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-sm font-bold">@</span>
          <Input
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            placeholder="mi_negocio"
            className="pl-8 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold tracking-tight mb-2 block text-foreground">Dirección (opcional)</label>
        <div className="relative bg-background/50 rounded-xl p-1 border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
          <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Av. Corrientes 1234, CABA"
            className="pl-10 border-0 bg-transparent focus-visible:ring-0 shadow-none text-[15px] font-medium"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 hover:-translate-y-0.5 shadow transition-all duration-300">
          {saving && <Loader2 size={16} className="animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
