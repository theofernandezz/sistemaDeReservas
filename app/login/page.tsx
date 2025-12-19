'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl opacity-50" />
        <div className="absolute top-[40%] right-[0%] w-[40%] h-[40%] rounded-full bg-rose-500/5 blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-serif font-bold text-xl shadow-lg mb-4">
            L
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Bienvenido de nuevo
          </h1>
          <p className="text-muted-foreground text-sm">
            Ingresa tus credenciales para acceder al panel.
          </p>
        </div>

        <Card className="border-0 shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-lg font-medium">Iniciar Sesión</CardTitle>
              <CardDescription>Acceso restringido a personal autorizado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    placeholder="admin@sivnails.com"
                    type="email"
                    required
                    className="pl-9 bg-white/50 border-gray-200 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="pl-9 bg-white/50 border-gray-200 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-medium shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all"
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

              <Link
                href="/"
                className="text-xs text-center text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                ← Volver al sitio principal
              </Link>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">
          © {new Date().getFullYear()} Siv Nails. Secured Access.
        </p>
      </div>
    </div>
  )
}
