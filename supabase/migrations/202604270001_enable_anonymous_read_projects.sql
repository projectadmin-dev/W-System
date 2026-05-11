-- =====================================================
-- Migration: Enable anonymous read for projects API testing
-- =====================================================
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Allow projects API to return data without auth for testing Kanban
-- NOTE: This is for DEVELOPMENT/TESTING only. Remove for production!
-- =====================================================

-- Method 1: Modify tenant_isolation policy to allow NULL tenant_id (bypass)
DROP POLICY IF EXISTS "tenant_isolation" ON public.projects;
CREATE POLICY "tenant_isolation" ON public.projects
  FOR ALL
  USING (
    -- Allow if tenant_id matches OR if no tenant context (for anon API testing)
    tenant_id = COALESCE(
      NULLIF(current_setting('app.current_tenant', true), '')::uuid,
      tenant_id  -- fallback: match any (dev mode)
    )
  );

-- Method 2: Also allow anon key to read all projects
DROP POLICY IF EXISTS "anon_read_projects" ON public.projects;
CREATE POLICY "anon_read_projects" ON public.projects
  FOR SELECT
  TO anon
  USING (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.projects TO anon;

-- Verify
SELECT 'RLS updated for testing' as status;
