interface UserWithAppMetadata {
  app_metadata?: Record<string, unknown> | null
}

// The super-admin role lives ONLY in app_metadata, which can only be written with the
// service role. Never read user_metadata here: any authenticated user can edit it.
export function hasSuperAdminRole(user: UserWithAppMetadata | null | undefined): boolean {
  return user?.app_metadata?.is_super_admin === true
}
