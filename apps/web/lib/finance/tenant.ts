import { createAdminClient } from '../supabase-server'

/**
 * Default tenant used across the Finance module. In this deployment every
 * user_profiles row belongs to this tenant.
 */
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

interface AuthUserLike {
  id?: string
  user_metadata?: Record<string, any> | null
  app_metadata?: Record<string, any> | null
}

/**
 * Resolve the tenant_id for an authenticated user.
 *
 * JWTs in this project do NOT carry a tenant_id claim, so the previous
 * approach (reading only user_metadata/app_metadata) always failed with
 * "Tenant context missing". Resolution order:
 *   1. JWT user_metadata.tenant_id
 *   2. JWT app_metadata.tenant_id
 *   3. user_profiles.tenant_id (profile id === auth user id)
 *   4. DEFAULT_TENANT_ID fallback
 */
export async function resolveTenantId(user: AuthUserLike | null): Promise<string> {
  const fromJwt = user?.user_metadata?.tenant_id ?? user?.app_metadata?.tenant_id
  if (fromJwt) return String(fromJwt)

  if (user?.id) {
    try {
      const admin = createAdminClient()
      const { data } = await admin
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.tenant_id) return String(data.tenant_id)
    } catch {
      // fall through to default
    }
  }

  return DEFAULT_TENANT_ID
}
