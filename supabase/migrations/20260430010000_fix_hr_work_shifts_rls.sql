-- =====================================================
-- Fix: hr_work_shifts RLS Policy
-- =====================================================
-- Problem: Policy was references non-existent role "hr_admin"
-- Solution: Use 'admin', 'hr', or 'super_admin' roles
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "HR admin can manage shifts" ON public.hr_work_shifts;

-- Create new policy with correct roles
CREATE POLICY "HR admin can manage shifts"
  ON public.hr_work_shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('admin', 'hr', 'super_admin')
      AND up.deleted_at IS NULL
    )
  );

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
