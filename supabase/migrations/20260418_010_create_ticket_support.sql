-- =====================================================
-- FASE-1: Ticket Module (Support & SLA Management)
-- =====================================================
-- Based on USER_STORIES v3.0 § 2.7-2.8 (US-Q2C-008, US-Q2C-009)
-- Ticket intake, SLA monitoring, time logging
-- =====================================================

-- 10.1 Priority Rules Table (auto-priority calculation)
CREATE TABLE IF NOT EXISTS public.priority_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_tier text NOT NULL CHECK (client_tier IN ('enterprise', 'mid', 'small')),
  category text NOT NULL CHECK (category IN ('support', 'bug', 'feature_request', 'consultation')),
  impact text NOT NULL CHECK (impact IN ('critical', 'high', 'medium', 'low')),
  urgency text NOT NULL CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  priority_result text NOT NULL CHECK (priority_result IN ('critical', 'high', 'medium', 'low')),
  sla_response_hours integer NOT NULL,
  sla_resolution_hours integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10.2 Seed default priority rules
INSERT INTO public.priority_rules (tenant_id, client_tier, category, impact, urgency, priority_result, sla_response_hours, sla_resolution_hours)
SELECT 
  t.id,
  rule.client_tier,
  rule.category,
  rule.impact,
  rule.urgency,
  rule.priority_result,
  rule.sla_response_hours,
  rule.sla_resolution_hours
FROM public.tenants t
CROSS JOIN (
  -- Enterprise clients
  ('enterprise', 'bug', 'critical', 'critical', 'critical', 2, 8),
  ('enterprise', 'bug', 'critical', 'high', 'critical', 4, 12),
  ('enterprise', 'bug', 'high', 'high', 'high', 8, 24),
  ('enterprise', 'support', 'medium', 'medium', 'medium', 24, 72),
  -- Mid clients
  ('mid', 'bug', 'critical', 'critical', 'critical', 4, 12),
  ('mid', 'bug', 'high', 'high', 'high', 8, 24),
  ('mid', 'support', 'medium', 'medium', 'medium', 24, 72),
  -- Small clients
  ('small', 'bug', 'critical', 'critical', 'high', 8, 24),
  ('small', 'support', 'medium', 'medium', 'medium', 48, 120)
) AS rule(client_tier, category, impact, urgency, priority_result, sla_response_hours, sla_resolution_hours)
ON CONFLICT DO NOTHING;

-- 10.3 Billing Rules Table (ticket billing logic)
CREATE TABLE IF NOT EXISTS public.billing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_category text NOT NULL CHECK (ticket_category IN ('support', 'bug', 'feature_request', 'consultation')),
  client_tier text, -- NULL = applies to all tiers
  billing_type text NOT NULL CHECK (billing_type IN ('warranty', 'retainer', 'ad_hoc', 'contract_covered', 'courtesy')),
  hourly_rate numeric(20,4),
  minimum_hours numeric(6,2) DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10.4 Tickets Table (core support entity)
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id),
  
  -- Ticket number (TKT-YYYY-MM-NNNN)
  ticket_number text NOT NULL UNIQUE,
  
  -- Links
  client_id uuid NOT NULL REFERENCES public.clients(id),
  submitted_by uuid REFERENCES public.user_profiles(id),
  project_id uuid, -- will link to projects table
  quotation_id uuid REFERENCES public.quotations(id),
  
  -- Channel
  channel text NOT NULL CHECK (channel IN ('portal', 'email', 'whatsapp', 'phone')),
  channel_reference text, -- email message_id, WhatsApp message ID
  
  -- Content
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('support', 'bug', 'feature_request', 'consultation')),
  category_auto boolean DEFAULT false, -- auto-categorized by AI
  
  -- Priority
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  priority_score integer CHECK (priority_score BETWEEN 0 AND 100),
  priority_auto boolean DEFAULT false, -- auto-calculated
  
  -- Impact & Urgency (for priority calculation)
  impact text CHECK (impact IN ('critical', 'high', 'medium', 'low')),
  urgency text CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  
  -- Status workflow
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'in_triage', 'triaged', 'in_progress',
    'waiting_client_info', 'waiting_client_approval',
    'delivered', 'approved', 'rejected', 'resolved',
    'auto_closed', 'converted_to_addendum'
  )),
  
  -- Assignment
  pic_commercial_id uuid REFERENCES public.user_profiles(id), -- triage owner
  pm_id uuid REFERENCES public.user_profiles(id), -- execution owner
  developer_id uuid REFERENCES public.user_profiles(id),
  
  -- SLA tracking
  response_sla_deadline timestamptz,
  response_sla_met_at timestamptz,
  resolution_sla_deadline timestamptz,
  resolution_sla_met_at timestamptz,
  sla_paused boolean NOT NULL DEFAULT false,
  sla_paused_at timestamptz,
  sla_pause_reason text,
  total_paused_duration interval DEFAULT '0'::interval,
  sla_breached boolean NOT NULL DEFAULT false,
  sla_breached_at timestamptz,
  
  -- Effort & billing
  estimated_hours numeric(6,2),
  actual_hours numeric(6,2) DEFAULT 0,
  billable boolean,
  billing_reason text CHECK (billing_reason IN (
    'warranty', 'retainer', 'ad_hoc', 'contract_covered', 'courtesy'
  )),
  invoice_id uuid, -- will link to invoices
  
  -- Conversion
  converted_to_project_id uuid, -- if converted to project
  source_quotation_id uuid REFERENCES public.quotations(id),
  
  -- Satisfaction
  csat_rating integer CHECK (csat_rating BETWEEN 1 AND 5),
  csat_comment text,
  csat_submitted_at timestamptz,
  
  -- Metadata
  tags text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 10.5 Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_pm_active ON tickets(pm_id) 
  WHERE status IN ('triaged', 'in_progress') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_sla_response ON tickets(response_sla_deadline) 
  WHERE sla_breached = false AND sla_paused = false AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_sla_resolution ON tickets(resolution_sla_deadline) 
  WHERE sla_breached = false AND sla_paused = false AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);

-- 10.6 Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 10.7 RLS Policies

-- Commercial: full tenant access (triage owner)
DROP POLICY IF EXISTS "commercial_manage_tickets" ON public.tickets;
CREATE POLICY "commercial_manage_tickets"
  ON public.tickets FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    )
  );

-- PM: read all tenant, update only assigned
DROP POLICY IF EXISTS "pm_read_tickets" ON public.tickets;
CREATE POLICY "pm_read_tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

DROP POLICY IF EXISTS "pm_update_assigned_tickets" ON public.tickets;
CREATE POLICY "pm_update_assigned_tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND pm_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND pm_id = auth.uid()
  );

-- Developer: read + update only assigned tickets
DROP POLICY IF EXISTS "developer_read_assigned_tickets" ON public.tickets;
CREATE POLICY "developer_read_assigned_tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('developer')
    )
    AND (pm_id = auth.uid() OR developer_id = auth.uid())
  );

DROP POLICY IF EXISTS "developer_update_assigned_tickets" ON public.tickets;
CREATE POLICY "developer_update_assigned_tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND developer_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND developer_id = auth.uid()
  );

-- CFO: read all for billing visibility
DROP POLICY IF EXISTS "cfo_read_tickets" ON public.tickets;
CREATE POLICY "cfo_read_tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('cfo', 'finance')
    )
  );

-- Client: read + insert own tickets
DROP POLICY IF EXISTS "client_read_own_tickets" ON public.tickets;
CREATE POLICY "client_read_own_tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND auth.jwt()->>'role' = 'client'
    AND client_id = (auth.jwt()->>'client_id')::uuid
  );

DROP POLICY IF EXISTS "client_insert_own_tickets" ON public.tickets;
CREATE POLICY "client_insert_own_tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND auth.jwt()->>'role' = 'client'
    AND client_id = (auth.jwt()->>'client_id')::uuid
  );

-- 10.8 Ticket Tasks Table (internal work breakdown)
CREATE TABLE IF NOT EXISTS public.ticket_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  
  -- Task details
  title text NOT NULL,
  description text,
  task_type text CHECK (task_type IN ('development', 'testing', 'documentation', 'deployment', 'other')),
  
  -- Assignment
  assigned_to uuid REFERENCES public.user_profiles(id),
  
  -- Status
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  
  -- Effort
  estimated_hours numeric(6,2),
  actual_hours numeric(6,2) DEFAULT 0,
  
  -- Dependencies
  depends_on uuid[], -- array of ticket_task ids
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  completed_at timestamptz,
  deleted_at timestamptz
);

-- 10.9 Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_tenant ON ticket_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_ticket ON ticket_tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_assigned ON ticket_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_tasks_status ON ticket_tasks(status) WHERE deleted_at IS NULL;

-- 10.10 Enable RLS
ALTER TABLE public.ticket_tasks ENABLE ROW LEVEL SECURITY;

-- 10.11 RLS Policies for Ticket Tasks

-- PM: full access to tasks for their tickets
DROP POLICY IF EXISTS "pm_manage_ticket_tasks" ON public.ticket_tasks;
CREATE POLICY "pm_manage_ticket_tasks"
  ON public.ticket_tasks FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
      AND t.pm_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
      AND t.pm_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

-- Developer: read + update own assigned tasks
DROP POLICY IF EXISTS "developer_read_ticket_tasks" ON public.ticket_tasks;
CREATE POLICY "developer_read_ticket_tasks"
  ON public.ticket_tasks FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('developer')
    )
    AND (assigned_to = auth.uid() OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
      AND t.developer_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "developer_update_own_ticket_tasks" ON public.ticket_tasks;
CREATE POLICY "developer_update_own_ticket_tasks"
  ON public.ticket_tasks FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND assigned_to = auth.uid()
  );

-- 10.12 Ticket Time Logs Table (effort tracking)
CREATE TABLE IF NOT EXISTS public.ticket_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  ticket_task_id uuid REFERENCES public.ticket_tasks(id) ON DELETE SET NULL,
  
  -- Time entry
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer NOT NULL,
  duration_hours numeric(6,2) GENERATED ALWAYS AS (duration_minutes / 60.0) STORED,
  
  -- Activity
  activity_type text CHECK (activity_type IN (
    'development', 'testing', 'debugging', 'meeting', 'documentation', 
    'code_review', 'deployment', 'research'
  )),
  description text,
  
  -- Billable
  billable boolean NOT NULL DEFAULT true,
  
  -- Ownership
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 10.13 Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_tenant ON ticket_time_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_ticket ON ticket_time_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_user ON ticket_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_date ON ticket_time_logs(started_at);

-- 10.14 Enable RLS
ALTER TABLE public.ticket_time_logs ENABLE ROW LEVEL SECURITY;

-- 10.15 RLS Policies for Time Logs

-- PM: read all time logs for their tickets
DROP POLICY IF EXISTS "pm_read_ticket_time_logs" ON public.ticket_time_logs;
CREATE POLICY "pm_read_ticket_time_logs"
  ON public.ticket_time_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
      AND t.pm_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

-- Developer: read + insert own time logs
DROP POLICY IF EXISTS "developer_read_own_time_logs" ON public.ticket_time_logs;
CREATE POLICY "developer_read_own_time_logs"
  ON public.ticket_time_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "developer_insert_time_logs" ON public.ticket_time_logs;
CREATE POLICY "developer_insert_time_logs"
  ON public.ticket_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- Finance: read all for billing
DROP POLICY IF EXISTS "finance_read_ticket_time_logs" ON public.ticket_time_logs;
CREATE POLICY "finance_read_ticket_time_logs"
  ON public.ticket_time_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo')
    )
  );

-- 10.16 Ticket Comments Table (communication thread)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  
  -- Content
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb, -- [{url, filename, size}]
  
  -- Visibility
  is_internal boolean NOT NULL DEFAULT false, -- internal notes vs client-visible
  
  -- Ownership
  author_id uuid NOT NULL REFERENCES public.user_profiles(id),
  author_role text, -- snapshot of role at comment time
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

-- 10.17 Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_comments_tenant ON ticket_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author ON ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created ON ticket_comments(ticket_id, created_at);

-- 10.18 Enable RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- 10.19 RLS Policies for Comments

-- Internal team: full access to internal comments
DROP POLICY IF EXISTS "team_manage_internal_comments" ON public.ticket_comments;
CREATE POLICY "team_manage_internal_comments"
  ON public.ticket_comments FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND is_internal = true
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name NOT IN ('client')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND is_internal = true
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name NOT IN ('client')
    )
  );

-- All roles: read/write non-internal comments on their tickets
DROP POLICY IF EXISTS "read_public_comments" ON public.ticket_comments;
CREATE POLICY "read_public_comments"
  ON public.ticket_comments FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND is_internal = false
  );

DROP POLICY IF EXISTS "insert_public_comments" ON public.ticket_comments;
CREATE POLICY "insert_public_comments"
  ON public.ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND is_internal = false
  );

-- 10.20 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS ticket_tasks_updated_at ON ticket_tasks;
CREATE TRIGGER ticket_tasks_updated_at
  BEFORE UPDATE ON ticket_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS ticket_time_logs_updated_at ON ticket_time_logs;
CREATE TRIGGER ticket_time_logs_updated_at
  BEFORE UPDATE ON ticket_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS ticket_comments_updated_at ON ticket_comments;
CREATE TRIGGER ticket_comments_updated_at
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10.21 Function: Calculate SLA deadline
CREATE OR REPLACE FUNCTION public.calculate_sla_deadline(
  p_ticket_id uuid,
  p_sla_type text -- 'response' or 'resolution'
)
RETURNS timestamptz AS $$
DECLARE
  ticket_record RECORD;
  priority_rule RECORD;
  deadline timestamptz;
BEGIN
  SELECT * INTO ticket_record FROM public.tickets WHERE id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get SLA config based on priority
  SELECT 
    CASE WHEN p_sla_type = 'response' THEN sla_response_hours ELSE sla_resolution_hours END as hours
  INTO priority_rule
  FROM public.priority_rules
  WHERE tenant_id = ticket_record.tenant_id
  AND priority_result = ticket_record.priority
  AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Default SLA if no rule found
    deadline := ticket_record.created_at + 
      CASE WHEN p_sla_type = 'response' THEN interval '24 hours' ELSE interval '72 hours' END;
  ELSE
    deadline := ticket_record.created_at + (priority_rule.hours || ' hours')::interval;
  END IF;
  
  RETURN deadline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
