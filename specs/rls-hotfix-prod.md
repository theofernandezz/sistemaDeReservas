## Outcome
Cerrar las políticas RLS de prod que dan acceso cross-tenant o exponen secretos, sin romper el booking público (anon y con sesión), el panel del dueño ni el webhook de MercadoPago.

## Estado de prod (pg_policies, 2026-10-20)
Nombres exactos a eliminar:
- `app_settings`: "Allow all for authenticated" (ALL, public, true/true). La tabla tiene `google_calendar_refresh_token` y `admin_notification_email`; el código no usa la tabla (todo sale de `businesses` / `google_integrations`).
- `mp_integrations` (0 filas): "Anyone can check if business has MP connected" (SELECT anon+authenticated, true — expone access_token), "Service role can insert MP integration" (INSERT public, true), "Service role can update MP integration" (UPDATE public, true/true).
- `appointments`: `admin_full_appointments` (ALL authenticated true/true).
- `services`: `admin_full_services` (ALL authenticated true/true).
- `blocked_slots`: `admin_full_blocked_slots` (ALL authenticated true/true).
- `service_addons`: "Allow authenticated insert" / "Allow authenticated update" / "Allow authenticated delete" (public, true), "Allow public read" (SELECT public, true — incluye inactivos).

Políticas que quedan y cubren los flujos legítimos (no tocar):
- appointments: "Business owners can manage own appointments" (ALL public, owner), "Public can create appointments" (INSERT public), "Public can view appointments by ID" (SELECT public), anon_insert_appointments, anon_select_appointments.
- services: "Business owners can manage own services", "Public can view active services", anon_select_services.
- blocked_slots: "Business owners can manage own blocked slots", "Public can view blocked slots", anon_select_blocked_slots.
- mp_integrations: "Business owners select own MP integration" (SELECT authenticated), "Business owners delete own MP integration" (DELETE public). El upsert del callback OAuth usa service client.
- service_addons: "Public can view active addons" (SELECT public, is_active = true).

## Scope
1. Webhook MP (`app/api/mercadopago/webhook/route.ts`): hoy lee `mp_integrations.access_token` con `createClient()` sin sesión (anon) — depende de "Anyone can check…". Pasar a `createServiceClient()` (después de validar la firma).
2. Tests del webhook (`app/api/mercadopago/webhook/webhook.test.ts`): los existentes pasan aunque el handler tire excepción (el catch devuelve 200) y el mock de `from()` devuelve un objeto nuevo por llamada, así que la configuración no llega al handler. Deben detectar que el webhook usa el service client y que un pago aprobado crea el turno.
3. Migración `supabase/migrations/023_rls_hotfix_prod.sql`: DROP por nombre exacto de las políticas listadas; nueva política "Business owners can manage own addons" en `service_addons` (FOR ALL TO authenticated, USING + WITH CHECK por `businesses.owner_id = auth.uid()`); al final, un bloque que haga fallar la migración si en esas 6 tablas queda alguna política con `qual = 'true'` o `with_check = 'true'` que no esté en la lista de "quedan" de arriba.

## Out of scope
- Storage / payment-proofs, `notifications` INSERT público.
- "Public can create appointments" (INSERT public with_check true) y "Public can view appointments by ID" (SELECT true): son P1 aparte, permiten insertar/leer turnos de cualquier negocio.
- Precio de add-ons tomado del cliente (`app/actions/payments.ts:455`).
- Super-admin viendo otro negocio en /dashboard (deja de poder editar; aceptado).
- `cancelAppointment` / `rescheduleAppointment` (`/cancel/[id]`) hacen UPDATE con cliente de sesión: un usuario logueado no-dueño deja de poder cancelar/reprogramar (antes pasaba por `admin_full_appointments`); anon ya no tenía política UPDATE en prod. Aceptado; P1 aparte (service client + autorización por token/link).
- Revocar el refresh token en Google y borrar la fila de `app_settings`: paso manual de Theo.

## Constraints
- La migración no borra datos.
- Orden: deploy del webhook ANTES de aplicar la migración (las migraciones se aplican a mano, no en el deploy).

## Acceptance criteria
- [ ] Tras la migración, ninguna de las políticas listadas en "Nombres exactos a eliminar" existe
- [ ] La migración falla (y no aplica nada) si queda una política permisiva no listada en esas tablas
- [ ] El dueño puede crear/editar/borrar addons de su negocio y no los de otro
- [ ] Anon ve solo addons activos
- [ ] El webhook usa el service client; un test falla si vuelve a `createClient()`
- [ ] El test de pago aprobado verifica que se crea el turno (falla si el handler no lo crea)
- [ ] Typecheck y suite completa pasan
