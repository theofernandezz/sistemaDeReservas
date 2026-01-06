'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Store, Link2, Check } from 'lucide-react'
import Link from 'next/link'
import { signUpWithBusiness } from '@/app/actions/auth'

// Función para generar slug desde nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  // Auto-generate slug when business name changes (if user hasn't manually edited it)
  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value)
    if (!slugTouched) {
      setSlug(generateSlug(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugTouched(true)
    // Sanitize al escribir
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password.length >= 6) {
      setStep(2)
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signUpWithBusiness({
        email,
        password,
        businessName,
        slug
      })

      if (result.error) {
        setError(result.error)
      } else {
        // Éxito - redirigir al dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 md:p-12 lg:p-24 bg-background">
        <div className="w-full max-w-sm space-y-8 animate-[fade-in_0.5s_ease-out]">

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {step === 1 ? 'Crea tu cuenta' : 'Configura tu negocio'}
            </h1>
            <p className="text-muted-foreground">
              {step === 1 ? 'Empieza gratis hoy.' : 'Ya casi terminamos.'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-muted/30"
                />
              </div>
              <Button type="submit" className="w-full h-11">
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2Submit} className="space-y-6 animate-[slide-up_0.3s_ease-out]">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre del negocio</Label>
                <Input
                  id="businessName"
                  placeholder="Ej: Estudio Creativo"
                  required
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                  className="h-11 bg-muted/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Link personalizado</Label>
                <div className="flex items-center">
                  <span className="bg-muted border border-r-0 rounded-l-md px-3 h-11 flex items-center text-muted-foreground text-sm">
                    reserva.com/
                  </span>
                  <Input
                    id="slug"
                    placeholder="mi-negocio"
                    required
                    pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="h-11 rounded-l-none bg-muted/30"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-11">
                  Atrás
                </Button>
                <Button type="submit" disabled={loading} className="h-11 flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Comenzar'
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center text-sm">
            <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:flex flex-col justify-center bg-zinc-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-md mx-auto space-y-8">
          <h2 className="text-3xl font-semibold mb-8">Únete a la revolución de la productividad.</h2>

          <div className="space-y-4">
            {[
              "Setup en menos de 2 minutos",
              "Integración con Google Calendar",
              "Pagos automáticos",
              "Soporte 24/7"
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
