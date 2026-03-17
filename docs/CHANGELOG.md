# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

-

### Changed

-

### Fixed

- Email fallback hardening: admin notifications no longer fall back to RESEND_FROM_MAIL when business lookup fails. Admin fallback now uses ADMIN_MAIL only.
- Google Calendar consistency: unified external calendar cleanup logic for appointment delete and cancel flows to avoid divergence between actions.
- Google Calendar token source audit: verified migration from app_settings to google_integrations scoped by business_id (same isolation pattern used by Mercado Pago).

---

## 2026-02-07

### Added

- Initialized changelog tracking.
