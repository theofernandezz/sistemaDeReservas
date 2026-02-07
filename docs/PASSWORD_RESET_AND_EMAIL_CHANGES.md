# Password reset and email updates

This document summarizes the changes made to password reset, email templates, and related UX updates.

## What was added or changed

### Password reset flow

- Added public reset request page: /forgot-password.
- Added reset page: /reset-password.
- Custom password reset emails sent via Resend using Supabase Admin link generation.
- Fallback to Supabase SMTP reset if custom email fails.
- Reset link rewriting to always target the app origin + /reset-password while preserving tokens.
- Auth callback kept for other flows; reset flow no longer depends on /auth/callback.

Key files:

- app/actions/auth.ts
- app/(auth)/forgot-password/page.tsx
- app/(auth)/reset-password/page.tsx
- app/auth/callback/route.ts

### Reset password UX

- Password strength meter (dynamic label + bar).
- Soft guidance list (min length, uppercase/lowercase, number, symbol).
- Live validation for password match.
- Caps Lock warning on the password field.
- Toggle visibility (eye icon) fixed to match state.
- Submit disabled when mismatch or session not ready.

Key file:

- app/(auth)/reset-password/page.tsx

### Email templates and centralization

- Password reset email template added in code (Resend).
- Cancellation and reschedule emails centralized in lib/email.ts.
- Cancellation and reschedule actions updated to use the centralized email helpers.

Key files:

- lib/email.ts
- app/actions.ts

## Email sources

- Custom emails (appointments, reminders, cancellations, reschedules, password reset): lib/email.ts
- Supabase Auth templates (signup verification, default reset if fallback is used): Supabase UI

## Configuration notes

- Supabase Auth redirect allowlist must include:
  - http://localhost:3000/reset-password
  - https://buki.devora.lat/reset-password
- For local testing, NEXT_PUBLIC_APP_URL should point to http://localhost:3000.
- For production, NEXT_PUBLIC_APP_URL should point to https://buki.devora.lat.

## Quick test checklist

- /forgot-password sends email and opens /reset-password
- Reset page sets session and updates password
- Cancellation flow sends admin email
- Reschedule flow sends admin + client emails
