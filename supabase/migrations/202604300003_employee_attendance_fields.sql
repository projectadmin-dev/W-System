-- =====================================================
-- Migration: Add Attendance to Employee Records
-- Date: 2026-04-30
-- Description: Add attendance tracking fields to employees
-- =====================================================

-- Add attendance-related fields to user_profiles (employees)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS attendance_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attendance_gps_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attendance_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS attendance_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS attendance_last_checkin TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attendance_last_checkout TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attendance_total_present_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_total_late_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_total_absent_this_month INTEGER DEFAULT 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_up_attendance_enabled ON user_profiles(attendance_enabled);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
