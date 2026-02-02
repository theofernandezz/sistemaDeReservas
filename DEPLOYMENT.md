# Guía de Deployment - Sistema de Reservas

> **Estado**: Listo para deployment a producción con 6 usuarios beta

---

## 📋 Checklist Pre-Deployment

### ✅ Código Implementado

- [x] Migración 013: Columnas faltantes en `pending_bookings`
- [x] Migración 014: Re-habilitación de RLS con policies correctas
- [x] Schemas Zod centralizados en `lib/schemas/index.ts`
- [x] Validación Zod en actions críticas
- [x] Validación de monto de pago en webhook
- [x] Configuración centralizada de URLs en `lib/config.ts`
- [x] Health endpoint en `/api/health`
- [x] `.env.example` con todas las variables documentadas
- [x] Build de producción pasando ✓

### ⚠️ CRÍTICO: Pasos Manuales del Usuario

Estos pasos **DEBEN** hacerse **ANTES** de deployar:

#### 1. Preparar Credenciales para Producción

**IMPORTANTE:** Usá credenciales de **producción** (no las de desarrollo).

**Credenciales que necesitás:**
- Supabase: Usá las mismas keys (son seguras, nunca fueron expuestas)
- Resend: Usá el mismo API key o generá uno nuevo si preferís
- MercadoPago: **Importante** - Usá credenciales de producción (no sandbox)
- Google OAuth: Usá las mismas credenciales

**Generar CRON_SECRET para producción:**
```bash
openssl rand -hex 32
```

**Solo rotá credenciales si:**
- ❌ Compartiste las credenciales por email/Slack/Discord
- ❌ Alguien más tuvo acceso a tu `.env.local`
- ❌ Sospechás que fueron comprometidas

**No necesitás rotar si:**
- ✅ El repo siempre fue privado
- ✅ Solo vos tenés acceso
- ✅ Nunca se commitearon al git (verificado ✓)

#### 2. Ejecutar Migraciones en Supabase

**ORDEN IMPORTANTE:**

1. Ir a Supabase Dashboard > SQL Editor
2. Ejecutar `supabase/migrations/013_fix_pending_bookings.sql`
3. Esperar confirmación
4. Ejecutar `supabase/migrations/014_reenable_rls_fixed.sql`
5. Esperar confirmación

**Verificar que las migraciones se ejecutaron correctamente:**

```sql
-- Verificar que pending_bookings tiene las nuevas columnas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pending_bookings'
AND column_name IN ('client_email', 'business_id');

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('services', 'appointments', 'blocked_slots', 'pending_bookings');
```

---

## 🚀 Deployment a Vercel

### 1. Configurar Variables de Entorno

En Vercel Dashboard > Project > Settings > Environment Variables:

**Agregar TODAS las variables de `.env.example`** con valores de producción:

```env
# Application
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app

# Supabase (mismas keys de desarrollo)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# MercadoPago (IMPORTANTE: usar credenciales de PRODUCCIÓN, no sandbox)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR_xxx
MERCADOPAGO_CLIENT_ID=xxx
MERCADOPAGO_CLIENT_SECRET=xxx
MP_WEBHOOK_SECRET=xxx (se genera al crear webhook)

# Resend
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@tu-dominio.com

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Cron (NUEVO para producción)
CRON_SECRET=xxx (generar con: openssl rand -hex 32)
```

**IMPORTANTE:** Configurar para **Production** environment.

### 2. Configurar Webhook de MercadoPago

**IMPORTANTE:** Asegurate de estar en modo **PRODUCCIÓN** en MercadoPago (no sandbox).

1. Ir a MercadoPago Developers > Webhooks
2. Si ya existe un webhook apuntando a localhost/desarrollo, eliminarlo
3. Crear webhook de producción:
   - URL: `https://tu-dominio.vercel.app/api/mercadopago/webhook`
   - Events: `payment`
   - MercadoPago generará un **webhook secret** automáticamente
4. Copiar el `MP_WEBHOOK_SECRET` y agregarlo en Vercel Environment Variables

### 3. Deploy

```bash
# Opción 1: Push a GitHub (recomendado)
git add .
git commit -m "feat: production deployment with security fixes"
git push origin main

# Opción 2: Vercel CLI
vercel --prod
```

### 4. Configurar Dominios (Opcional)

Si usás dominio personalizado:

1. Vercel Dashboard > Domains
2. Agregar dominio
3. Configurar DNS según instrucciones de Vercel
4. Actualizar `NEXT_PUBLIC_APP_URL` con el dominio final

---

## 🔍 Verificación Post-Deployment

### 1. Health Check

```bash
curl https://tu-dominio.vercel.app/api/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-02T...",
  "checks": [
    { "name": "database", "status": "ok" },
    { "name": "environment", "status": "ok" }
  ],
  "version": "abc1234"
}
```

### 2. Test de Booking Flow

1. Ir a `https://tu-dominio.vercel.app/test-business` (o tu slug de negocio)
2. Seleccionar servicio
3. Completar formulario
4. Procesar pago con MercadoPago (usar tarjeta de prueba)
5. Verificar que:
   - Se crea el appointment
   - Llegan los emails
   - Se actualiza el pending_booking

### 3. Test de Multi-Tenancy

1. Crear segundo negocio (o usar existente)
2. Verificar que:
   - Business A no puede ver datos de Business B en dashboard
   - Services están correctamente filtrados por business
   - RLS funciona correctamente

### 4. Verificar Emails

1. Crear un turno de prueba
2. Verificar que llegan:
   - Email de confirmación al cliente
   - Email de notificación al admin

### 5. Verificar Cron Job

Vercel configurará automáticamente el cron job según `vercel.json`.

**Verificar en Vercel Dashboard > Cron Jobs:**
- Debe aparecer `send-reminders` con schedule `0 11 * * *`

**Test manual:**
```bash
curl -X GET https://tu-dominio.vercel.app/api/cron/send-reminders \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

---

## 📊 Monitoreo

### Logs en Vercel

Vercel Dashboard > Logs para ver:
- Errores de runtime
- Webhook callbacks
- Cron job executions

### Métricas Clave a Monitorear

1. **Appointments creados**: Verificar en Supabase
2. **Pending bookings convertidos**: Verificar que `status = 'paid'`
3. **Emails enviados**: Verificar logs de Resend
4. **Webhook failures**: Verificar logs de MercadoPago

### Alertas Recomendadas

Configurar en Vercel:
- **Failed function invocations** > 5 en 5 minutos
- **Error rate** > 1% en 1 hora
- **Response time** > 1s en 5 minutos

---

## 🐛 Troubleshooting

### Error: "Invalid signature" en webhook

**Causa:** `MP_WEBHOOK_SECRET` incorrecto.

**Solución:**
1. Recrear webhook en MercadoPago
2. Actualizar `MP_WEBHOOK_SECRET` en Vercel
3. Redeploy

### Error: "Missing env vars" en /api/health

**Causa:** Variables de entorno no configuradas.

**Solución:**
1. Verificar todas las variables en Vercel Dashboard
2. Redeploy

### Error: RLS "permission denied"

**Causa:** Policies de RLS no aplicadas correctamente.

**Solución:**
1. Verificar que migración 014 se ejecutó
2. Verificar en Supabase que las policies existen
3. Re-ejecutar migración si es necesario

### Appointments no se crean desde webhook

**Causa:** Validación de monto fallando.

**Solución:**
1. Verificar logs del webhook en Vercel
2. Buscar mensaje "SECURITY: Payment amount mismatch"
3. Verificar que `pending.payment_amount` está en centavos
4. Verificar que `payment.transaction_amount` está en ARS

---

## 📁 Archivos Críticos Modificados

### Migraciones
- `supabase/migrations/013_fix_pending_bookings.sql`
- `supabase/migrations/014_reenable_rls_fixed.sql`

### Validación
- `lib/schemas/index.ts` (nuevo)

### Configuración
- `lib/config.ts` (nuevo)
- `.env.example` (nuevo)

### APIs
- `app/api/health/route.ts` (nuevo)
- `app/api/mercadopago/webhook/route.ts` (actualizado)

### Actions
- `app/actions.ts` (validación agregada)
- `app/actions/team.ts` (validación agregada)
- `app/actions/onboarding.ts` (validación agregada)
- `app/actions/payments.ts` (URLs centralizadas)

### Utils
- `lib/email.ts` (URLs centralizadas)

### Metadata
- `app/layout.tsx` (URLs centralizadas)
- `app/sitemap.ts` (URLs centralizadas)
- `app/robots.ts` (URLs centralizadas)
- `components/seo/structured-data.tsx` (URLs centralizadas)

---

## 🔐 Seguridad Post-Deployment

### Inmediatamente Después del Deploy

1. ✅ Verificar que `/api/health` no expone valores sensibles
2. ✅ Confirmar que `.env.local` está en `.gitignore` (ya verificado ✓)
3. ✅ Verificar que RLS está funcionando correctamente
4. ✅ Testear multi-tenancy (Business A no ve datos de Business B)

### Mantenimiento Continuo

- **Monitorear logs de seguridad en Vercel**
- **Revisar policies de RLS periódicamente**
- **Actualizar dependencias regularmente**
- **Rotar credenciales solo si hay sospecha de compromiso**

---

## 📞 Soporte

Si encontrás problemas durante el deployment:

1. Verificar logs en Vercel Dashboard
2. Ejecutar `/api/health` para diagnóstico
3. Revisar esta guía para troubleshooting
4. Verificar que todas las migraciones se ejecutaron

---

## ✅ Checklist Final

Antes de invitar a los 6 usuarios beta:

- [ ] Health endpoint retorna `healthy`
- [ ] Credenciales de producción configuradas en Vercel
- [ ] Migraciones ejecutadas en Supabase (013 y 014)
- [ ] RLS verificado y funcionando
- [ ] Test de booking flow exitoso
- [ ] Emails de confirmación llegando
- [ ] Webhook de MercadoPago funcionando (URL de producción)
- [ ] Multi-tenancy verificado
- [ ] Cron job configurado en Vercel
- [ ] Dominios configurados (si aplica)
- [ ] Monitoreo configurado en Vercel
- [ ] MercadoPago en modo PRODUCCIÓN (no sandbox)

---

**Fecha de preparación**: 2026-02-02
**Versión**: 1.0
**Estado**: ✅ Listo para producción
