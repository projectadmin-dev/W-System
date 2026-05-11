-- =====================================================
-- Migration: Create HR Attendance Module
-- Date: 2026-04-30
-- Description: US-HR-002 Attendance with GPS validation
-- Tables: attendance_logs, attendance_settings, attendance_approval
-- =====================================================

-- ============================================
-- 1. ATTENDANCE SETTINGS (Global Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  work_shift_id UUID REFERENCES hr_work_shifts(id),
  office_location TEXT NOT NULL DEFAULT 'Head Office',
  lat_decimal DECIMAL(10, 8),
  lng_decimal DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 100,
  work_hours_start TIME DEFAULT '09:00:00',
  work_hours_end TIME DEFAULT '18:00:00',
  grace_period_minutes INTEGER DEFAULT 15,
  max_late_minutes INTEGER DEFAULT 30,
  early_leave_allowed BOOLEAN DEFAULT true,
  early_leave_minutes INTEGER DEFAULT 30,
  required_checkins_per_day INTEGER DEFAULT 2,
  require_photo_checkin BOOLEAN DEFAULT true,
  require_gps BOOLEAN DEFAULT true,
  auto_close_session BOOLEAN DEFAULT false,
  auto_close_after_hours INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_as_tenant ON attendance_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_as_shift ON attendance_settings(work_shift_id);

-- ============================================
-- 2. ATTENDANCE LOGS (Employee Checkin/Checkout)
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  checkin_time TIMESTAMPTZ,
  checkout_time TIMESTAMPTZ,
  checkin_lat DECIMAL(10, 8),
  checkin_lng DECIMAL(11, 8),
  checkout_lat DECIMAL(10, 8),
  checkout_lng DECIMAL(11, 8),
  checkin_distance_meters INTEGER,
  checkout_distance_meters INTEGER,
  checkin_photo_url TEXT,
  checkout_photo_url TEXT,
  device_info TEXT,
  ip_address TEXT,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'early_leave', 'absent', 'leave', 'off_day')),
  shift_schedule_id UUID,
  work_hours_start TIME,
  work_hours_end TIME,
  late_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approved_status TEXT DEFAULT 'pending' CHECK (approved_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_al_tenant ON attendance_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_al_employee ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_al_date ON attendance_logs(attendance_date);
CREATE INDEX IF NOT EXISTS idx_al_status ON attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_al_approved ON attendance_logs(approved_status);

-- ============================================
-- 3. ATTENDANCE APPROVAL WORKFLOW
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('late', 'early_leave', 'absent', 'off_day')),
  reason TEXT NOT NULL,
  attachment_url TEXT,
  requesting_employee_id UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aa_tenant ON attendance_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aa_employee ON attendance_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_aa_approval ON attendance_approvals(approved_by);

-- ============================================
-- 4. ATTENDANCE HISTORY (Monthly Summary)
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month
  total_present INTEGER DEFAULT 0,
  total_late INTEGER DEFAULT 0,
  total_early_leave INTEGER DEFAULT 0,
  total_absent INTEGER DEFAULT 0,
  total_leave INTEGER DEFAULT 0,
  total_overtime_hours DECIMAL(6, 2) DEFAULT 0,
  summary jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ah_tenant ON attendance_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ah_employee ON attendance_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_ah_month ON attendance_history(month);

-- ============================================
-- 5. ATTENDANCE HOLIDAYS (Company Holidays)
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  holiday_name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'monthly', 'yearly'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ah_tenant ON attendance_holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ah_date ON attendance_holidays(holiday_date);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AttendanceSettings_All"
  ON attendance_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AttendanceLogs_All"
  ON attendance_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE attendance_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AttendanceApprovals_All"
  ON attendance_approvals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE attendance_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AttendanceHistory_All"
  ON attendance_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE attendance_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AttendanceHolidays_All"
  ON attendance_holidays FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================
-- Auto-update updated_at
DROP TRIGGER IF EXISTS attendance_settings_updated_at ON attendance_settings;
CREATE TRIGGER attendance_settings_updated_at
  BEFORE UPDATE ON attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS attendance_logs_updated_at ON attendance_logs;
CREATE TRIGGER attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS attendance_approvals_updated_at ON attendance_approvals;
CREATE TRIGGER attendance_approvals_updated_at
  BEFORE UPDATE ON attendance_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS attendance_history_updated_at ON attendance_history;
CREATE TRIGGER attendance_history_updated_at
  BEFORE UPDATE ON attendance_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS attendance_holidays_updated_at ON attendance_holidays;
CREATE TRIGGER attendance_holidays_updated_at
  BEFORE UPDATE ON attendance_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
