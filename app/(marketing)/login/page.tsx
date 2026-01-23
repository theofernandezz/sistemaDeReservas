'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Command } from 'lucide-react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      // Si no hay error, es porque redirigió exitosamente
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
            <h1 className="text-3xl font-semibold tracking-tight">Bienvenido</h1>
            <p className="text-muted-foreground">Ingresa a tu cuenta para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error === 'Invalid login credentials' ? 'Credenciales incorrectas' : error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="nombre@ejemplo.com"
                type="email"
                required
                className="h-11 bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 bg-muted/30"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">¿No tienes cuenta? </span>
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-lg font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md">R</div>
            Reserva
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <blockquote className="space-y-6">
            <p className="text-2xl font-serif italic leading-relaxed">
              &ldquo;Desde que usamos Reserva, hemos reducido el ausentismo en un 40% y recuperado 10 horas semanales de gestión.&rdquo;
            </p>
            <footer className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/20" />
              <div>
                <div className="font-semibold">Sofía M.</div>
                <div className="text-sm text-white/60">CEO, Estética Avanzada</div>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
