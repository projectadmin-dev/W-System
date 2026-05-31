import { createServerClient as createSSRClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      db: { schema: 'public' } // Force public schema
    }
  );
}

/**
 * Create admin client with service role key (bypasses RLS)
 * Use for server-side operations only
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // The whole Finance module reads through this service-role client because RLS
  // on finance tables is keyed on an `auth.jwt() ->> 'tenant_id'` claim that this
  // project's JWTs do NOT carry — so the normal (authenticated) client returns
  // zero rows. If the service-role key is missing the reports come back empty and
  // pages render blank. Fail loudly with an actionable message instead of letting
  // supabase-js throw a cryptic "supabaseKey is required".
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not configured on the server. ' +
      'Finance reports require it — set it in the deployment environment and restart/redeploy.'
    );
  }

  return createClient(url, serviceKey, {
    db: { schema: 'public' },
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Duplicate removed — createAdminClient already defined above
