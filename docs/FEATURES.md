# Features and Status

Track what exists, what is in progress, and what is planned.

## Active Features

- Auth flows (signup, login, password reset via Resend)
- Onboarding (business + slug creation on first login)
- Public booking page (`/[slug]`) — service selection, time slot picker, client form
- Payments — Mercado Pago OAuth connect/disconnect, deposit % config, pending_bookings webhook flow
- Admin dashboard
  - Home with today's agenda
  - Appointments list (filter by date, status, service)
  - Calendar view + blocked slot management
  - Services CRUD (create, edit, toggle active, soft delete)
  - Service add-ons CRUD
  - Availability / business hours config
  - WhatsApp reminder panel (manual — generates pre-filled link for staff to send)
  - In-app notification inbox (read/unread, delete)
  - Settings — business profile, admin email, Google Calendar OAuth, Mercado Pago, deposit %, reschedule window, account deletion request
- Email notifications via Resend — new booking (admin + client), cancellation, reschedule, password reset
- Google Calendar integration — auto-create/update/delete events on appointments
- Appointment rescheduling — enforces configurable hours-before-appointment limit
- Super-admin panel — impersonate any business via cookie

## Known Limitations

- WhatsApp reminders are **manual** — no WhatsApp Business API. Staff copies a pre-filled wa.me link.
- `pending_bookings` (pre-payment records) have no automated cleanup job for expired entries.
- Account deletion requires manual intervention — only creates a system notification.

## In Progress

-

## Planned / Backlog

- Automated cleanup of expired `pending_bookings`
- Real WhatsApp API integration (Twilio / Meta API)
- Client/patient history view
- Recurring appointment support

## Recently Completed

- 2026-03-10: Fixed `business_id` missing from `createService` and `createBlockedSlot` inserts
- 2026-03-10: Removed debug `test-supabase` page from app
