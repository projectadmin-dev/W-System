-- ============================================================================
-- QA Test Plan logging — generic test-run registry for the Finance modules.
-- A "run" is one execution of a test plan; "cases" are the individual results.
-- public.* schema, admin client bypasses RLS.
-- ============================================================================

-- ── Test run (plan-level) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qa_test_runs (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID            NOT NULL,

  module        VARCHAR(60)     NOT NULL,            -- e.g. account-payable
  title         VARCHAR(300)    NOT NULL,
  description   TEXT,
  environment   VARCHAR(200),                        -- how/where it was executed
  executed_by   VARCHAR(200),
  executed_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  total         INTEGER         NOT NULL DEFAULT 0,
  passed        INTEGER         NOT NULL DEFAULT 0,
  failed        INTEGER         NOT NULL DEFAULT 0,
  blocked       INTEGER         NOT NULL DEFAULT 0,
  skipped       INTEGER         NOT NULL DEFAULT 0,
  pass_rate     NUMERIC(6,2)    NOT NULL DEFAULT 0,  -- percentage
  status        VARCHAR(20)     NOT NULL DEFAULT 'PASS'
                    CHECK (status IN ('PASS','FAIL','PARTIAL')),

  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qa_runs_module ON public.qa_test_runs(tenant_id, module) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qa_runs_date   ON public.qa_test_runs(tenant_id, executed_at DESC) WHERE deleted_at IS NULL;

-- ── Test case (result-level) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qa_test_cases (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID            NOT NULL REFERENCES public.qa_test_runs(id) ON DELETE CASCADE,
  tenant_id     UUID            NOT NULL,

  case_code     VARCHAR(30)     NOT NULL,            -- TC-001
  user_story    VARCHAR(30),                         -- US-001
  title         TEXT            NOT NULL,
  category      VARCHAR(30)     NOT NULL DEFAULT 'functional', -- functional|negative|boundary|integration
  method        VARCHAR(30)     NOT NULL DEFAULT 'Automated',  -- Automated|Code Review|Manual
  priority      VARCHAR(10)     NOT NULL DEFAULT 'Medium',     -- High|Medium|Low
  expected      TEXT,
  actual        TEXT,
  status        VARCHAR(10)     NOT NULL DEFAULT 'PASS'
                    CHECK (status IN ('PASS','FAIL','BLOCKED','NA')),
  notes         TEXT,
  seq           INTEGER         NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_cases_run ON public.qa_test_cases(run_id);
