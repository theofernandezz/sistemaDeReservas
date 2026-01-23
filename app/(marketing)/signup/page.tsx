'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, AlertCircle, Check } from 'lucide-react'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signUp({ email, password })

      if (result.error) {
        setError(result.error)
      } else {
        setEmailSent(true)
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

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {emailSent ? '¡Revisa tu email!' : 'Crea tu cuenta'}
            </h1>
            <p className="text-muted-foreground">
              {emailSent
                ? 'Te enviamos un link para verificar tu cuenta.'
                : 'Empieza gratis hoy.'}
            </p>
          </div>

          {emailSent ? (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enviamos un email a <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Haz clic en el link para verificar tu cuenta y configurar tu negocio.
                </p>
              </div>
              <Button variant="outline" onClick={() => window.location.href = 'https://mail.google.com'} className="w-full">
                Abrir Gmail
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

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
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta'
                )}
              </Button>
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
