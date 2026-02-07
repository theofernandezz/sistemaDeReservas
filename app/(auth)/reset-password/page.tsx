'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Check, Loader2, Lock, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/public/logo/icon.png'
import { updatePassword } from '@/app/actions/auth'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'

const PASSWORD_STRENGTH_LABELS = [
  'Muy debil',
  'Debil',
  'Regular',
  'Buena',
  'Fuerte',
] as const

function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return Math.min(score, 4)
}

function getStrengthBarClass(score: number): string {
  if (score <= 1) return 'bg-red-500'
  if (score === 2) return 'bg-amber-500'
  if (score === 3) return 'bg-emerald-500'
  return 'bg-green-600'
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const strengthScore = getPasswordStrength(password)
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword
  const passwordHints = [
    { label: 'Minimo 8 caracteres', ok: password.length >= 8 },
    { label: '1 letra mayuscula y 1 minuscula', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: '1 numero', ok: /\d/.test(password) },
    { label: '1 simbolo', ok: /[^A-Za-z0-9]/.test(password) },
  ]

  useEffect(() => {
    let isActive = true

    const initSession = async () => {
      try {
        const supabase = createClient()
        const code = searchParams.get('code')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            if (isActive) setError('El enlace no es valido o ya expiro.')
          } else if (isActive) {
            setSessionReady(true)
          }
          return
        }

        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            if (isActive) setError('El enlace no es valido o ya expiro.')
          } else if (isActive) {
            setSessionReady(true)
          }
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (isActive) {
          if (!session) setError('Inicia el proceso desde el email de recuperacion.')
          setSessionReady(Boolean(session))
        }
      } catch {
        if (isActive) setError('No pudimos validar tu sesion.')
      }
    }

    initSession()

    return () => {
      isActive = false
    }
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    if (!sessionReady) {
      setLoading(false)
      setError('El enlace de recuperacion no es valido.')
      return
    }

    if (password !== confirmPassword) {
      setLoading(false)
      setError('Las contraseñas no coinciden.')
      return
    }

    try {
      const result = await updatePassword({ password })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('No pudimos actualizar la contraseña. Intenta de nuevo.')
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
              {success ? '¡Listo!' : 'Nueva contraseña'}
            </h1>
            <p className="text-sm text-zinc-500">
              {success ? 'Ya puedes iniciar sesión con tu nueva clave.' : 'Ingresa una contraseña segura.'}
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 mx-auto bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100 shadow-sm">
              <Check className="w-8 h-8 text-black" />
            </div>
            <div className="space-y-3 bg-zinc-50/50 border border-zinc-100 p-6 rounded-2xl">
              <p className="text-sm text-zinc-600">
                Contraseña actualizada correctamente.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild className="w-full h-12 bg-black text-white hover:bg-zinc-800 transition-colors rounded-xl font-medium text-sm shadow-lg shadow-zinc-900/10">
                <Link href="/login">
                  Ir al Login <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
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
                <Label htmlFor="password" className="text-zinc-500 text-xs uppercase tracking-wider font-medium ml-1">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyUp={(event) => setCapsLockOn(event.getModifierState('CapsLock'))}
                    onBlur={() => setCapsLockOn(false)}
                    className="h-12 pl-10 pr-10 bg-zinc-50 border-zinc-200 text-black focus:bg-white focus:border-black/20 focus:ring-black/5 transition-all rounded-xl shadow-sm"
                    aria-describedby="password-hints password-strength"
                    aria-invalid={passwordsMismatch}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
                    aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500" id="password-strength">
                    <span>Seguridad</span>
                    <span className="text-zinc-600">{PASSWORD_STRENGTH_LABELS[strengthScore]}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100">
                    <div
                      className={cn('h-1.5 rounded-full transition-all duration-300', getStrengthBarClass(strengthScore))}
                      style={{ width: `${(strengthScore / 4) * 100}%` }}
                    />
                  </div>
                </div>
                {capsLockOn && (
                  <p className="text-[11px] text-amber-600">Caps Lock activado.</p>
                )}
                <div className="space-y-1 text-[11px] text-zinc-400" id="password-hints">
                  {passwordHints.map((hint) => (
                    <div key={hint.label} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          hint.ok ? 'bg-emerald-500' : 'bg-zinc-300'
                        )}
                      />
                      <span className={cn(hint.ok && 'text-zinc-600')}>{hint.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-500 text-xs uppercase tracking-wider font-medium ml-1">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 pl-10 pr-10 bg-zinc-50 border-zinc-200 text-black focus:bg-white focus:border-black/20 focus:ring-black/5 transition-all rounded-xl shadow-sm"
                    aria-invalid={passwordsMismatch}
                    aria-describedby="password-match"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
                    aria-label={showConfirmPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  >
                    {showConfirmPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p
                  id="password-match"
                  className={cn(
                    'text-[11px] transition-colors',
                    passwordsMismatch ? 'text-red-500' : 'text-zinc-400'
                  )}
                >
                  {passwordsMatch && 'Las contrasenas coinciden.'}
                  {passwordsMismatch && 'Las contrasenas deben coincidir.'}
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !sessionReady || passwordsMismatch}
              className="w-full h-12 bg-black text-white hover:bg-zinc-800 transition-colors rounded-xl font-medium text-sm shadow-lg shadow-zinc-900/10"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Contraseña'
              )}
            </Button>
          </form>
        )}

        {!success && (
          <div className="mt-8 text-center bg-white">
            <Link href="/login" className="inline-flex items-center text-xs text-zinc-500 hover:text-black transition-colors font-medium">
              <ArrowLeft className="mr-1 h-3 w-3" /> Volver al login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
