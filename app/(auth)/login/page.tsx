'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Loader2, AlertCircle, Mail, Lock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/public/logo/icon.png'
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
    } catch {
      // Quietly handle redirect
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-white text-zinc-950">

      <div className="w-full max-w-[400px] animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10 space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image src={logo} alt="Buki" width={48} height={48} className="h-12 w-auto object-contain" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-serif font-medium tracking-tight text-black">
              Bienvenido a Buki
            </h1>
            <p className="text-sm text-zinc-500">
              Gestión inteligente para profesionales.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error === 'Invalid login credentials' ? 'Credenciales incorrectas' : error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-500 text-xs uppercase tracking-wider font-medium ml-1">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  id="email"
                  name="email"
                  placeholder="nombre@ejemplo.com"
                  type="email"
                  required
                  className="h-12 pl-10 bg-zinc-50 border-zinc-200 text-black placeholder:text-zinc-400 focus:bg-white focus:border-black/20 focus:ring-black/5 transition-all rounded-xl shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-500 text-xs uppercase tracking-wider font-medium ml-1">Contraseña</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-500 hover:text-black transition-colors font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="h-12 pl-10 bg-zinc-50 border-zinc-200 text-black focus:bg-white focus:border-black/20 focus:ring-black/5 transition-all rounded-xl shadow-sm"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-black text-white hover:bg-zinc-800 transition-colors rounded-xl font-medium text-sm shadow-lg shadow-zinc-900/10"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              <>
                Ingresar <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-black hover:underline underline-offset-4 transition-colors font-medium">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
