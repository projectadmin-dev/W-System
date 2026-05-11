-- =====================================================
-- Migration: Create Attendance API Endpoints (Supabase Edge Function Helper)
-- Date: 2026-04-30
-- Description: Provide helper functions for attendance calculation
-- =====================================================

-- Function: Calculate late minutes
CREATE OR REPLACE FUNCTION public.calculate_late_minutes(
  checkin_time TIMESTAMPTZ,
  work_hours_start TIME
) RETURNS INTEGER AS $$
DECLARE
  checkin_time_only TIME;
  late_minutes INTEGER;
BEGIN
  checkin_time_only := checkin_time::time;
  
  IF checkin_time_only > work_hours_start THEN
    late_minutes := EXTRACT(EPOCH FROM (checkin_time_only - work_hours_start)) / 60;
    RETURN GREATEST(0, late_minutes::integer);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate early leave minutes
CREATE OR REPLACE FUNCTION public.calculate_early_leave_minutes(
  checkout_time TIMESTAMPTZ,
  work_hours_end TIME
) RETURNS INTEGER AS $$
DECLARE
  checkout_time_only TIME;
  early_leave_minutes INTEGER;
BEGIN
  checkout_time_only := checkout_time::time;
  
  IF checkout_time_only < work_hours_end THEN
    early_leave_minutes := EXTRACT(EPOCH FROM (work_hours_end - checkout_time_only)) / 60;
    RETURN GREATEST(0, early_leave_minutes::integer);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate overtime hours
CREATE OR REPLACE FUNCTION public.calculate_overtime_hours(
  checkout_time TIMESTAMPTZ,
  work_hours_end TIME,
  max_overtime_hours INTEGER DEFAULT 3
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
  checkout_time_only TIME;
  overtime_seconds BIGINT;
  overtime_hours DECIMAL(5, 2);
BEGIN
  checkout_time_only := checkout_time::time;
  
  IF checkout_time_only > work_hours_end THEN
    overtime_seconds := EXTRACT(EPOCH FROM (checkout_time_only - work_hours_end));
    overtime_hours := overtime_seconds / 3600;
    RETURN LEAST(overtime_hours, max_overtime_hours::decimal);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Get attendance status
CREATE OR REPLACE FUNCTION public.get_attendance_status(
  checkin_time TIMESTAMPTZ,
  checkout_time TIMESTAMPTZ,
  work_hours_start TIME,
  work_hours_end TIME,
  grace_period_minutes INTEGER DEFAULT 15,
  max_late_minutes INTEGER DEFAULT 30
) RETURNS TEXT AS $$
DECLARE
  status TEXT;
  checkin_time_only TIME;
  checkout_time_only TIME;
BEGIN
  -- Check if absent
  IF checkin_time IS NULL AND checkout_time IS NULL THEN
    RETURN 'absent';
  END IF;
  
  checkin_time_only := checkin_time::time;
  
  -- Check if off day or holiday (simplified - full logic handled by API)
  -- Default to present if checkin exists
  status := 'present';
  
  -- Check late status
  IF checkin_time_only > work_hours_start THEN
    IF EXTRACT(EPOCH FROM (checkin_time_only - work_hours_start)) / 60 > max_late_minutes THEN
      status := 'late';
    END IF;
  END IF;
  
  -- Check early leave
  IF checkout_time IS NOT NULL THEN
    checkout_time_only := checkout_time::time;
    IF checkout_time_only < work_hours_end THEN
      -- Early leave detected
      IF status = 'present' THEN
        status := 'early_leave';
      END IF;
    END IF;
  END IF;
  
  RETURN status;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
