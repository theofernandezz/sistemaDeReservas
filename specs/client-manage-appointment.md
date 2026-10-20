## Outcome
Un cliente (nunca tiene cuenta) gestiona su turno desde un link secreto: lo ve, lo cancela o lo reprograma, y la acción se aplica de verdad. Nadie sin ese link puede ver datos personales de turnos ni modificarlos.

## Estado actual (relevado 2026-10-20, prod + código)
- Única credencial: el UUID del turno en `/cancel/[id]`. Aparece en la URL de éxito, back_urls de MP (`app/actions/payments.ts:324-326`), mail al dueño (`lib/email.ts:577`) y es listable.
- `appointments` en prod: SELECT público `USING true` ("Public can view appointments by ID", `anon_select_appointments`) → anon lista todos los turnos con email/teléfono. No hay política UPDATE para anon.
- `cancelAppointment` (`app/actions.ts:1577`): UPDATE como anon afecta 0 filas sin error; igual manda mails de "cancelado" a cliente y dueño y devuelve success.
- `rescheduleAppointment` (`app/actions.ts:2036`): falla siempre para anon (PGRST116, error crudo al usuario). No valida la hora nueva (pasado, horario, bloqueos, duración viene del cliente, no filtra `team_member_id`, hora armada en zona del navegador en `app/cancel/[id]/reschedule-form.tsx:96`).
- UI de cancelar usa `rescheduleHours` (sin UI, siempre 24; `||` convierte 0 en 24); servidor usa `cancellationHours`; confirm muestra "24hs" fijo (`app/booking/[serviceId]/confirm/page.tsx:706`).
- Se pueden cancelar turnos pasados no `completed` (`app/actions.ts:1611`).
- `reason` y `client_name` se insertan sin escapar en HTML de mails (`lib/email.ts:217-226, 350-352`).
- Sin `cancelled_at`/`cancelled_by`. Google Calendar nunca se sincroniza en acciones del cliente (token de `google_integrations` solo legible por el dueño).
- Sin tests de este flujo.

## Decisiones (Theo, 2026-10-20)
- Link con token secreto, sin cuenta de cliente.
- Token firmado con HMAC (revisado 2026-10-20, reemplaza "guardar solo el hash"): `token = appointment_id + '.' + base64url(HMAC-SHA256(MANAGE_LINK_SECRET, appointment_id + ':' + manage_token_version))` (el id es solo clave de búsqueda; la credencial es el MAC). El servidor lo recalcula cuando lo necesita (confirmación, recordatorios del cron, página de éxito, reenvío); no se guarda en DB. Invalidar un link = incrementar `manage_token_version` del turno. Rotar `MANAGE_LINK_SECRET` invalida todos.
- Links viejos `/cancel/{id}`: la página ofrece "reenviar link a tu email" → manda el link nuevo al `client_email` del turno. Nunca acepta el id solo como credencial para ver datos ni actuar.
- Reprogramaciones sin límite.
- Seña/pago al cancelar: sin reembolso automático; el mail al dueño avisa explícitamente si el turno tenía pago/seña para que lo resuelva a mano.
- Correcciones tras verifier (2026-10-20):
  - Ningún endpoint convierte un id (de turno o de pending_booking) en token. `createBookingPaymentPreference` recibe el token, no el id.
  - Flujo `pending_bookings` (MP): la página de éxito NO muestra el token; indica que el link llega por mail (lo manda el webhook). Reemplaza lo pedido antes para ese flujo.
  - Disponibilidad: un slot solo es válido si termina dentro del horario de atención (aplica también al booking).
  - Reenvío: además del límite por turno, tope global por hora; envío del mail con `after()` para no revelar existencia por tiempo de respuesta.
- Entrega en dos PR: A (flujo con token) y luego B (cerrar lectura pública). B depende de A.

---

## PR A — Flujo con token

### Scope
1. Migración: `appointments.manage_token_version integer NOT NULL DEFAULT 1`, `cancelled_at timestamptz`, `cancelled_by text` ('client' | 'owner'). Sin backfill de tokens: los turnos existentes tienen link válido de inmediato.
2. Token HMAC (ver Decisiones) en todos los mails al cliente que linkean al turno, incluidos los recordatorios del cron, y en la redirección a la página de éxito (directa, MP con turno ya creado y flujo `pending_bookings` una vez que el webhook creó el turno). Validación con comparación en tiempo constante. `MANAGE_LINK_SECRET` validado al usarse; sin él, error claro en logs y nunca un link inválido.
3. Acciones nuevas del cliente, todas por token, con Zod, usando service client solo después de validar el token, devolviendo solo campos necesarios (sin datos de otros turnos):
   - ver turno por token
   - cancelar por token
   - reprogramar por token
   - reenviar link (input: id de turno; manda el link vigente —sin rotar versión— al `client_email` registrado; respuesta idéntica exista o no el turno; rate limit básico por turno)
4. Reglas server-side:
   - Cancelar: solo `pending`/`confirmed`, futuro, fuera de `cancellationHours`.
   - Reprogramar: ventana `rescheduleHours` sobre la hora original; hora nueva validada con la misma lógica de disponibilidad del booking (horario, bloqueos, `team_member_id`, `minAdvanceHours`, `maxAdvanceDays`); `end_time` calculado con la duración del servicio; hora en America/Argentina/Buenos_Aires.
   - `rescheduleHours` con `??` (0 válido) y campo editable en la UI de configuración junto a `cancellationHours`.
   - Mails, Google Calendar y revalidate SOLO si el UPDATE afectó la fila (verificar filas devueltas).
   - Registrar `cancelled_at` y `cancelled_by`.
   - Mail al dueño al cancelar indica si había pago/seña (`payment_status`, `payment_amount`) y que debe gestionarlo manualmente.
   - Escapar HTML de todo dato del cliente en los mails.
5. UI:
   - Página nueva `/turno/[token]` (ver, cancelar, reprogramar), con mensajes de error legibles (nunca errores crudos).
   - `/cancel/[id]`: deja de cargar datos del turno; muestra el botón de reenvío.
   - Página de éxito y back_urls de MP: usan el token en vez del id. Texto de política de cancelación lee `cancellationHours`.
   - Mails al cliente (confirmación, transferencia pendiente, recordatorio) linkean a `/turno/{token}`. Mail al dueño linkea al dashboard, no a la página pública.
6. Tests: uno por criterio de aceptación de PR A.

### Out of scope (PR A)
Cerrar la lectura pública (PR B). (Sí en scope: borrar `cancelAppointment`, `rescheduleAppointment` y `canRescheduleAppointment` de `app/actions.ts` cuando `/cancel/[id]` deje de usarlas.) Reembolsos MP. Límite de reprogramaciones. Cuentas de cliente. Cambiar el cron de cleanup.

### Acceptance criteria (PR A)
- [ ] El token no se guarda en DB; se recalcula desde id + versión; token de otro turno, de otra versión o alterado es rechazado
- [ ] Confirmación, recordatorio del cron y página de éxito (directa y MP con turno ya creado) llevan link `/turno/{token}` válido; pending muestra aviso de mail
- [ ] Incrementar `manage_token_version` invalida el link anterior
- [ ] Con token válido: ver, cancelar y reprogramar funcionan siendo anon; con token inválido o ausente: error genérico, sin datos
- [ ] Cancelar cambia `status`, `cancelled_at`, `cancelled_by='client'`; si el UPDATE no afecta la fila, no se manda ningún mail y se devuelve error
- [ ] Cancelar rechaza turnos pasados, `completed`, `cancelled` y dentro de `cancellationHours`
- [ ] Reprogramar rechaza: hora pasada, fuera de horario, slot bloqueado, solapado con otro turno del mismo profesional, fuera de `rescheduleHours`; calcula `end_time` desde la duración del servicio; usa hora AR
- [ ] Reenvío de link: manda mail solo al `client_email` del turno; misma respuesta exista o no el turno
- [ ] `/cancel/[id]` no muestra datos del turno
- [ ] Mail al dueño de cancelación indica pago/seña cuando corresponde
- [ ] Datos del cliente escapados en HTML de mails
- [ ] Ninguna Server Action ni página devuelve o redirige con un token a partir de un id de turno o de pending_booking
- [ ] Solo la forma canónica del token es aceptada (sin variantes por bits sobrantes ni id en mayúsculas)
- [ ] No se ofrecen slots cuyo fin supere el horario de atención, y reprogramar no los acepta (validación server-side de `createAppointment`: P1 aparte)
- [ ] Reprogramar un turno sin profesional asignado no puede solaparse con otro turno del negocio
- [ ] Reenvío: tope global por hora; tiempo de respuesta independiente de que el turno exista
- [ ] La página de éxito muestra el comprobante ya subido
- [ ] `rescheduleHours` editable y 0 es un valor válido
- [ ] Typecheck y suite pasan

---

## PR B — Cerrar lectura pública de appointments

### Scope
1. Inventario de todos los lectores de `appointments` que hoy corren como anon (sin sesión) y moverlos a: (a) lectura por token (PR A), (b) service client en servidor con autorización explícita, o (c) RPC.
2. RPC `SECURITY DEFINER` para disponibilidad: dado `business_id` (+ opcional `team_member_id`) y rango de fechas, devuelve solo `start_time`, `end_time`, `team_member_id` de turnos no cancelados. Ejecutable por anon.
3. `createAppointment`: el INSERT público no puede depender de SELECT público para el `RETURNING` (mover a service client tras validar input, o no pedir retorno).
4. Migración: DROP de "Public can view appointments by ID" y `anon_select_appointments`, con guard final que aborte si queda un SELECT `true` en `appointments`. Aplicación manual, después del deploy.

### Out of scope (PR B)
"Public can create appointments" (INSERT público) — se revisa aparte. Storage, notifications.

### Acceptance criteria (PR B)
- [ ] Anon no puede leer ninguna fila de `appointments` vía PostgREST
- [ ] Booking público completo (ver horarios, reservar, página de éxito) funciona como anon
- [ ] Disponibilidad calculada vía RPC sin exponer datos personales
- [ ] Panel del dueño sin cambios
- [ ] Typecheck y suite pasan
