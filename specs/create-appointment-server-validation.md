## Outcome
El servidor decide todo lo que afecta plata, estado y agenda de un turno. Nada de lo que manda el navegador en el booking público puede cambiar precio, seña, duración, estado o pago.

## Estado actual (2026-10-20)
- `createAppointment` (`app/actions.ts:604`) inserta `status` y `payment_status` del input (`app/[slug]/booking/[serviceId]/confirm/confirm-form.tsx:213` manda `status: 'confirmed'`). `end_time` viene del cliente; solo se chequea solapamiento, no horario/bloqueos/anticipación.
- `createBookingPaymentPreference(token, customAmount)` (`app/actions/payments.ts:275`, línea ~336) cobra `customAmount` tal cual. El caller (`app/booking/[serviceId]/confirm/page.tsx:246`) lo calcula como seña o total según `paymentMethod === 'full'`.
- `createPendingBookingPreference` (`app/actions/payments.ts:432`) suma `addons[].price` del cliente (~477).
- Uso legítimo de estado elegido: carga manual del dueño (`components/dashboard/add-appointment-dialog.tsx:177`, `status: 'confirmed'`).

## Scope
1. `createAppointment`:
   - Input público: servicio, hora de inicio, add-on ids, profesional (opcional), datos del cliente. `end_time` se calcula en el servidor = inicio + duración del servicio + duración de los add-ons (leídos de DB). Si el input trae `end_time`, se ignora o se rechaza si no coincide.
   - Add-ons: se buscan por id en DB; deben estar activos y pertenecer al servicio/negocio; si alguno no, VALIDATION_ERROR.
   - La hora se valida con `computeAvailableSlots` (`lib/availability.ts`) con la duración total: horario de atención, bloqueos, `minAdvanceHours`, `maxAdvanceDays`, solapamiento, `team_member_id`.
   - `status` y `payment_status`: si quien llama es el dueño autenticado del negocio del servicio, se respetan los del input (carga manual). Si no, los decide el servidor según la configuración de pago del negocio (MP conectado → pendiente de pago; transferencia manual → `confirmed` + payment_status `pending` (igual que hoy; recordatorios del cron dependen de `confirmed`); sin pago → el estado que hoy usa el flujo sin pago). El input del cliente se ignora.
2. `createBookingPaymentPreference(token, option: 'deposit' | 'full')`: sin monto del cliente. Monto = total del turno (servicio + add-ons desde DB) o seña con `deposit_percentage` del negocio. Actualizar el caller.
3. `createPendingBookingPreference`: precio y duración de add-ons desde DB por id, mismas reglas del punto 1.
4. Ajustar los forms públicos para no mandar `status`/`payment_status`/`end_time`/precios (mandar ids y la opción de pago).

## Out of scope
Storage `payment-proofs` público y `notifications` INSERT público (PR siguiente). Política INSERT pública de appointments. Reembolsos.

## Constraints
Sin migración. Zod en todo input. Sin `any`, sin enums. Errores legibles, nunca crudos. Pago MP y transferencia siguen funcionando igual para el usuario.

## Acceptance criteria
- [ ] Anon que manda `status: 'confirmed'` o `payment_status: 'paid'` → el turno queda con el estado que decide el servidor
- [ ] Dueño autenticado puede crear turno manual `confirmed` desde el dashboard
- [ ] `end_time` siempre = inicio + duración servicio + add-ons de DB; un `end_time` del cliente no cambia nada
- [ ] Rechaza: fuera de horario, slot bloqueado, solapado, antes de `minAdvanceHours`, después de `maxAdvanceDays`, slot que termina después del cierre
- [ ] Add-on inexistente, inactivo o de otro servicio → VALIDATION_ERROR
- [ ] Monto MP = seña (`deposit_percentage`) o total según `option`, calculado en servidor; no existe parámetro de monto del cliente
- [ ] `createPendingBookingPreference` ignora precios de add-ons del cliente
- [ ] Booking público con MP (seña y total), con transferencia y sin pago funcionan
- [ ] Transferencia manual queda `confirmed` + `payment_status: 'pending'` (como antes)
- [ ] Cliente que elige "cualquier profesional": el servidor acepta el slot si algún profesional activo está libre y asigna ese
- [ ] `createBookingPaymentPreference` rechaza turnos cancelados o ya pagados / en `pending_confirmation`
- [ ] Typecheck y suite pasan
