-- Add missing posted_at column to journal_entries
-- Needed for PSAK audit trail compliance

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS posted_at timestamptz;

-- Also add posting_date default if missing
ALTER TABLE public.journal_entries
ALTER COLUMN posting_date SET DEFAULT CURRENT_DATE;
