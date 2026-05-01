-- =====================================================
-- Migration: Create project_tasks table for Kanban board
-- =====================================================
-- EPIC: US-PM-001 (Kanban Board), US-PM-002 (Milestone + Gantt)
-- Default columns: Backlog, Todo, In Progress, In Review, Done
-- =====================================================

-- Drop existing if re-running
DROP TABLE IF EXISTS public.project_tasks CASCADE;

-- Tasks table
CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project ownership
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Task content
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done')),

  -- People
  assignee_id uuid REFERENCES public.user_profiles(id),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),

  -- Tracking
  priority text DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Timeline
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,

  -- Ordering (for drag-drop)
  position integer NOT NULL DEFAULT 0,

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX idx_tasks_tenant ON public.project_tasks(tenant_id);
CREATE INDEX idx_tasks_project ON public.project_tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.project_tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.project_tasks(status);
CREATE INDEX idx_tasks_position ON public.project_tasks(project_id, position);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "tasks_tenant_isolation" ON public.project_tasks;
CREATE POLICY "tasks_tenant_isolation" ON public.project_tasks
  FOR ALL
  USING (
    tenant_id = COALESCE(
      NULLIF(current_setting('app.current_tenant', true), '')::uuid,
      tenant_id
    )
  );

-- Allow anon read (for development / kanban)
DROP POLICY IF EXISTS "anon_read_tasks" ON public.project_tasks;
CREATE POLICY "anon_read_tasks" ON public.project_tasks
  FOR SELECT TO anon USING (true);

-- Allow anon update (for kanban drag-drop)
DROP POLICY IF EXISTS "anon_update_tasks" ON public.project_tasks;
CREATE POLICY "anon_update_tasks" ON public.project_tasks
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow anon insert
DROP POLICY IF EXISTS "anon_insert_tasks" ON public.project_tasks;
CREATE POLICY "anon_insert_tasks" ON public.project_tasks
  FOR INSERT TO anon WITH CHECK (true);

-- Grants
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.project_tasks TO anon;
GRANT ALL ON public.project_tasks TO authenticated;

-- Seed sample tasks for development
INSERT INTO public.project_tasks
  (tenant_id, project_id, title, description, status, priority, position, assignee_id, created_by, due_date)
SELECT
  t.id,
  p.id,
  'Setup project infrastructure',
  'Configure dev environment, CI/CD pipeline, and initial server setup',
  'done',
  'high',
  1,
  up_pm.id,
  up_pm.id,
  CURRENT_DATE + INTERVAL '1 day'
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT id FROM public.projects WHERE tenant_id = t.id LIMIT 1
) p
CROSS JOIN LATERAL (
  SELECT id FROM public.user_profiles WHERE tenant_id = t.id LIMIT 1
) up_pm
WHERE t.id = (
  SELECT id FROM public.tenants LIMIT 1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.project_tasks
  (tenant_id, project_id, title, description, status, priority, position, assignee_id, created_by, due_date)
SELECT
  t.id,
  p.id,
  'Design database schema',
  'Create ERD and implement migrations for core modules',
  'in_progress',
  'high',
  2,
  up_pm.id,
  up_pm.id,
  CURRENT_DATE + INTERVAL '3 days'
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT id FROM public.projects WHERE tenant_id = t.id LIMIT 1
) p
CROSS JOIN LATERAL (
  SELECT id FROM public.user_profiles WHERE tenant_id = t.id LIMIT 1
) up_pm
WHERE t.id = (
  SELECT id FROM public.tenants LIMIT 1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.project_tasks
  (tenant_id, project_id, title, description, status, priority, position, assignee_id, created_by, due_date)
SELECT
  t.id,
  p.id,
  'Implement authentication module',
  'Setup Supabase Auth, RBAC, and session management',
  'todo',
  'medium',
  3,
  up_pm.id,
  up_pm.id,
  CURRENT_DATE + INTERVAL '7 days'
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT id FROM public.projects WHERE tenant_id = t.id LIMIT 1
) p
CROSS JOIN LATERAL (
  SELECT id FROM public.user_profiles WHERE tenant_id = t.id LIMIT 1
) up_pm
WHERE t.id = (
  SELECT id FROM public.tenants LIMIT 1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.project_tasks
  (tenant_id, project_id, title, description, status, priority, position, assignee_id, created_by, due_date)
SELECT
  t.id,
  p.id,
  'Code review: API endpoints',
  'Review and approve all REST API endpoints for security and performance',
  'in_review',
  'medium',
  4,
  up_pm.id,
  up_pm.id,
  CURRENT_DATE + INTERVAL '5 days'
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT id FROM public.projects WHERE tenant_id = t.id LIMIT 1
) p
CROSS JOIN LATERAL (
  SELECT id FROM public.user_profiles WHERE tenant_id = t.id LIMIT 1
) up_pm
WHERE t.id = (
  SELECT id FROM public.tenants LIMIT 1
)
ON CONFLICT DO NOTHING;

INSERT INTO public.project_tasks
  (tenant_id, project_id, title, description, status, priority, position, assignee_id, created_by, due_date)
SELECT
  t.id,
  p.id,
  'User acceptance testing',
  'Conduct UAT with client stakeholders and document feedback',
  'backlog',
  'low',
  5,
  NULL,
  up_pm.id,
  CURRENT_DATE + INTERVAL '14 days'
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT id FROM public.projects WHERE tenant_id = t.id LIMIT 1
) p
CROSS JOIN LATERAL (
  SELECT id FROM public.user_profiles WHERE tenant_id = t.id LIMIT 1
) up_pm
WHERE t.id = (
  SELECT id FROM public.tenants LIMIT 1
)
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'project_tasks table created' as status;
