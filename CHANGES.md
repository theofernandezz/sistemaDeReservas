# Cambios recientes — contexto para testing

## 1. Auto-selección de especialista cuando hay uno solo

**Archivo:** `app/[slug]/booking/[serviceId]/page.tsx`

**Qué cambió:** Si el equipo tiene exactamente un miembro, el paso de selección de especialista se saltea y redirige directo al calendario con ese miembro preseleccionado. Antes solo salteaba si había 0 miembros (redirecta a `?member=any`).

**Cómo testear:**
- Negocio con equipo de 1 miembro → hacer una reserva → debe ir directo al calendario sin pasar por la pantalla de "elegir especialista"
- Negocio con equipo de 2+ miembros → debe seguir mostrando la pantalla de selección
- Negocio sin miembros → debe redirigir a `?member=any` como antes

---

## 2. Payment proof — flujo completo de comprobante de transferencia

### 2a. `payment_status` se guarda en la DB al crear el appointment

**Archivos:** `lib/schemas/index.ts`, `types/database.types.ts`, `app/actions.ts`, `app/[slug]/booking/[serviceId]/confirm/page.tsx`

**Qué cambió:** El flujo de transferencia manual ahora crea el appointment con `payment_status: 'pending'` en la DB. Antes quedaba `null`.

**Cómo testear:**
- Hacer una reserva con pago por transferencia manual
- Verificar en Supabase que el appointment tiene `payment_status = 'pending'` y `status = 'pending'`

### 2b. Email correcto para transferencia manual

**Archivo:** `lib/email.ts` — nueva función `sendManualTransferPendingEmail`

**Qué cambió:** Antes, todos los appointments recibían el email "Reserva confirmada". Ahora, si `payment_status === 'pending'`, el cliente recibe un email diferente:
- Subject: `"Completá tu reserva — [servicio]"`
- Título: "Reserva pre-confirmada"
- Botón que lleva a `/reserva/[id]` para subir el comprobante

**Cómo testear:**
- Hacer una reserva con transferencia manual con un email real
- Verificar que llega el email correcto (no "Reserva confirmada")
- Verificar que el botón del email lleva a `/reserva/[id]`
- Hacer una reserva sin pago (negocio sin MP y sin transferencia) → debe llegar el email "Reserva confirmada" de siempre

### 2c. Página `/reserva/[id]` — subir comprobante más tarde

**Archivo:** `app/reserva/[id]/page.tsx` (ya existía)

**Qué muestra según el estado del appointment:**
- `payment_status = 'pending'` → muestra datos de transferencia + card para subir comprobante
- `payment_status = 'pending_confirmation'` → mensaje "estamos revisando tu comprobante"
- `payment_status = 'paid'` → turno confirmado
- `payment_status = 'rejected'` → motivo de rechazo + opción de subir de nuevo

**Cómo testear:**
- Entrar a `/reserva/[id]` con un appointment en cada estado
- Verificar que la card de upload aparece solo cuando `payment_status = 'pending'` o `rejected`

### 2d. Página booking/success — card de upload

**Archivo:** `app/[slug]/booking/success/page.tsx`

**Qué muestra:** Cuando el negocio tiene transferencia manual activa y llega con `?status=pending`, muestra los datos de transferencia + `ProofUploadCard`.

**Condiciones para que aparezca la card:**
- URL tiene `?status=pending`
- `settings.paymentFlowMode === 'manual_transfer'`
- `settings.manualTransfer.enabled === true`

**Cómo testear:**
- Hacer una reserva con transferencia manual → al finalizar debe aparecer la card de upload en la success page
- Subir un comprobante → debe mostrar el estado "enviado"
- Verificar en Supabase que `proof_url` se guarda en el appointment

---

## 3. Flujo de revisión de comprobantes (dashboard del negocio)

**Archivos:** `components/dashboard/pending-proofs-section.tsx`, `components/dashboard/proof-review-card.tsx`, `app/dashboard/appointments/page.tsx`

**Qué hace:** El negocio puede aprobar o rechazar comprobantes desde el dashboard.

**Server actions:** `app/actions/proof.ts`
- `approvePaymentProof` → setea `payment_status = 'paid'`, confirma el appointment
- `rejectPaymentProof` → setea `payment_status = 'rejected'` con motivo

**Cómo testear:**
- Subir un comprobante como cliente
- Ir al dashboard → debe aparecer la sección de comprobantes pendientes
- Aprobar → el appointment debe pasar a `status = 'confirmed'`, `payment_status = 'paid'`
- Rechazar con motivo → el cliente ve el motivo en `/reserva/[id]` y puede subir uno nuevo

---

## 4. Cron de limpieza extendido

**Archivo:** `app/api/cron/cleanup/route.ts`

**Nuevos comportamientos agregados:**
- Auto-aprobación de comprobantes después de X tiempo (si el negocio lo tiene configurado)
- Expiración de reservas que quedaron en `payment_status = 'pending'` sin comprobante

**Cómo testear:** Requiere trigger manual del cron o esperar el ciclo automático.

---

## Estado de la migration

**Archivo:** `supabase/migrations/019_payment_proofs.sql`

Esta migration agrega a la tabla `appointments`:
- `payment_status` (enum: pending / pending_confirmation / paid / rejected)
- `proof_url`
- `proof_uploaded_at`
- `proof_rejection_reason`
- `proof_reviewed_at`

**Importante:** Si la migration no está aplicada en el ambiente de testing, los features de proof no van a funcionar. Verificar con:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_status';
```
