## Outcome
El rol super-admin solo se puede otorgar con service role. Hoy se decide con `user_metadata.is_super_admin`, que cualquier usuario puede setearse a sí mismo con `supabase.auth.updateUser({ data: { is_super_admin: true } })` (anon key + signup abierto) y así acceder a acciones que usan `createServiceClient()`.

## Scope
Reemplazar todos los checks de `user_metadata.is_super_admin` por `app_metadata.is_super_admin`:
- `proxy.ts:43`
- `app/super-admin/page.tsx:14`
- `app/actions/super-admin.ts:20` (`assertSuperAdmin`)
- `app/actions/auth.ts:30, 284, 297, 429`

Paso de datos (fuera del código, lo ejecuta Theo/orquestador con OK explícito, ANTES del deploy): setear `app_metadata.is_super_admin = true` en la(s) cuenta(s) super-admin legítima(s) de prod y quitar el flag de `user_metadata` en todas las cuentas.

## Out of scope
Flujo "super-admin viendo otro negocio" en /dashboard (no se usa por ahora). Hotfix RLS (`specs/rls-hotfix-prod.md`).

## Constraints
- Ningún check puede aceptar `user_metadata` como fuente del rol, ni como fallback.
- Un único helper para el check, en vez de repetir la expresión en 7 lugares, si encaja con el estilo del repo.

## Acceptance criteria
- [ ] `grep -rn "user_metadata?.is_super_admin\|user_metadata.is_super_admin"` sobre app/, lib/, utils/, proxy.ts no devuelve resultados
- [ ] Un usuario con `user_metadata.is_super_admin = true` y sin `app_metadata` es tratado como usuario normal en proxy, página /super-admin y acciones de super-admin
- [ ] Un usuario con `app_metadata.is_super_admin = true` mantiene acceso
- [ ] Cada criterio de arriba tiene un test
- [ ] Typecheck y suite de tests pasan
