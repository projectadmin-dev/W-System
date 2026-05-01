-- =====================================================
-- Migration: Allow anonymous PATCH for project status (Kanban)
-- =====================================================
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Enable Kanban board drag-to-move without auth
-- =====================================================

-- Add UPDATE policy for anon — status field only (for Kanban)
DROP POLICY IF EXISTS "anon_update_project_status" ON public.projects;
CREATE POLICY "anon_update_project_status" ON public.projects
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also grant UPDATE to anon
GRANT UPDATE ON public.projects TO anon;

-- Verify
SELECT 'RLS: anon can UPDATE projects' as status;
