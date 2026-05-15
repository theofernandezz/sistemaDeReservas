'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBusinessAccount } from '@/app/actions/super-admin'
import { ArrowLeft, Eye, EyeOff, RefreshCw, CheckCircle2, Copy, Check } from 'lucide-react'
import { checkSlugAvailability } from '@/app/actions/onboarding'
import { useDebouncedCallback } from 'use-debounce'

interface CreateBusinessFormProps {
  onBack: () => void
  onCreated: (businessId: string) => void
}

function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'mi-negocio'
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  return password
}

export function CreateBusinessForm({ onBack, onCreated }: CreateBusinessFormProps) {
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null)
  const [created, setCreated] = useState<{ businessId: string; email: string; password: string } | null>(null)

  const [form, setForm] = useState({
    email: '',
    password: '',
    businessName: '',
    slug: '',
  })

  const checkSlug = useDebouncedCallback(async (slug: string) => {
    if (slug.length < 2) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    try {
      const result = await checkSlugAvailability(slug)
      setSlugStatus(result.available ? 'available' : 'taken')
    } catch {
      setSlugStatus('idle')
    }
  }, 500)

  const handleNameChange = (value: string) => {
    const newSlug = slugTouched ? form.slug : generateSlug(value)
    setForm(f => ({ ...f, businessName: value, slug: newSlug }))
    if (!slugTouched) checkSlug(newSlug)
  }

  const handleSlugChange = (value: string) => {
    setSlugTouched(true)
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, slug: sanitized }))
    checkSlug(sanitized)
  }

  const handleGeneratePassword = () => {
    setForm(f => ({ ...f, password: generatePassword() }))
    setShowPassword(true)
  }

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (slugStatus === 'taken') {
      setError('El slug ya está en uso')
      return
    }

    startTransition(async () => {
      const result = await createBusinessAccount(form)
      if (!result.success || !result.data) {
        setError(result.error ?? 'Error desconocido')
        return
      }
      setCreated({ businessId: result.data.businessId, email: form.email, password: form.password })
    })
  }

  if (created) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Cuenta creada exitosamente</h2>
              <p className="text-zinc-400 text-sm">Guardá las credenciales antes de continuar</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-zinc-800 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-zinc-500 text-xs mb-1">Email</p>
                <p className="text-white font-mono text-sm">{created.email}</p>
              </div>
              <button
                onClick={() => copyToClipboard(created.email, 'email')}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                {copiedField === 'email' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-zinc-500 text-xs mb-1">Contraseña</p>
                <p className="text-white font-mono text-sm">{created.password}</p>
              </div>
              <button
                onClick={() => copyToClipboard(created.password, 'password')}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                {copiedField === 'password' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Volver al listado
            </Button>
            <Button
              onClick={() => onCreated(created.businessId)}
              className="flex-1 bg-white text-black hover:bg-zinc-200"
            >
              Configurar negocio
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Nuevo negocio</h2>
          <p className="text-zinc-400 text-sm mt-0.5">La cuenta se crea verificada, el cliente puede loguearse de inmediato</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Credentials */}
          <div className="space-y-3">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Credenciales del cliente</p>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-300 text-sm">Contraseña</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    minLength={8}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePassword}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 shrink-0"
                  title="Generar contraseña"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800" />

          {/* Business info */}
          <div className="space-y-3">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Datos del negocio</p>

            <div className="space-y-1.5">
              <Label htmlFor="businessName" className="text-zinc-300 text-sm">Nombre del negocio</Label>
              <Input
                id="businessName"
                placeholder="Ej: Barbería Don Juan"
                value={form.businessName}
                onChange={e => handleNameChange(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-zinc-300 text-sm">Slug (URL pública)</Label>
              <div className="flex items-center">
                <span className="bg-zinc-800 border border-r-0 border-zinc-700 rounded-l-md px-3 h-11 flex items-center text-zinc-500 text-sm shrink-0">
                  reservas/
                </span>
                <div className="relative flex-1">
                  <Input
                    id="slug"
                    placeholder="barberia-don-juan"
                    value={form.slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 rounded-l-none font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                    {slugStatus === 'available' && <span className="text-green-400">✓</span>}
                    {slugStatus === 'taken' && <span className="text-red-400">✗</span>}
                    {slugStatus === 'checking' && <span className="text-zinc-500">...</span>}
                  </div>
                </div>
              </div>
              {slugStatus === 'taken' && (
                <p className="text-red-400 text-xs">Ese slug ya está en uso</p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending || slugStatus === 'taken'}
            className="w-full bg-white text-black hover:bg-zinc-200 h-11 font-medium"
          >
            {isPending ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </form>
      </div>
    </div>
  )
}
