'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, AlertCircle, Check, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/public/logo/icon.png'
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-white text-zinc-950">

      <div className="w-full max-w-[400px] animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10 space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image src={logo} alt="Buki" width={48} height={48} className="h-12 w-auto object-contain" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-serif font-medium tracking-tight text-black">
              {emailSent ? 'Verifica tu Envío' : 'Crea tu cuenta'}
            </h1>
            <p className="text-sm text-zinc-500">
              {emailSent ? 'Hemos enviado un enlace a tu correo.' : 'Comienza a gestionar tu negocio hoy.'}
            </p>
          </div>
        </div>

        {emailSent ? (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 mx-auto bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100 shadow-sm">
              <Mail className="w-8 h-8 text-black" />
            </div>
            <div className="space-y-3 bg-zinc-50/50 border border-zinc-100 p-6 rounded-2xl">
              <p className="text-sm text-zinc-600">
                Enviamos un email a <strong className="text-black font-medium">{email}</strong>
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Haz clic en el enlace mágico para verificar tu cuenta y configurar tu perfil profesional.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => window.location.href = 'https://mail.google.com'}
                className="w-full h-12 border-zinc-200 text-black hover:bg-zinc-50 transition-all rounded-xl"
              >
                Abrir Gmail
              </Button>
            </div>
            <Link href="/login" className="inline-flex items-center text-xs text-zinc-500 hover:text-black transition-colors mt-4 font-medium">
              <ArrowLeft className="mr-1 h-3 w-3" /> Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-500 text-xs uppercase tracking-wider font-medium ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 bg-zinc-50 border-zinc-200 text-black placeholder:text-zinc-400 focus:bg-white focus:border-black/20 focus:ring-black/5 transition-all rounded-xl shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-500 text-xs uppercase tracking-wider font-medium ml-1">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {!emailSent && (
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-black hover:underline underline-offset-4 transition-colors font-medium">
                Iniciar Sesión
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
