-- Migration: 2026041800126_create_ticket_support.sql
-- Description: Create ticket support tables (required by finance invoices)
-- Dependencies: 0001 (tenants), 0002 (entities), 0005 (user_profiles), 00125 (projects)

-- Drop existing if re-running
DROP TABLE IF EXISTS public.ticket_time_logs CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.billing_rules CASCADE;
DROP TABLE IF EXISTS public.priority_rules CASCADE;

-- 10.1 Priority Rules Table (auto-priority calculation)
CREATE TABLE public.priority_rules (
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

-- Indexes
CREATE INDEX idx_priority_rules_tenant ON public.priority_rules(tenant_id);
CREATE INDEX idx_priority_rules_client_tier ON public.priority_rules(client_tier);
CREATE INDEX idx_priority_rules_category ON public.priority_rules(category);

-- RLS
ALTER TABLE public.priority_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.priority_rules;
CREATE POLICY "tenant_isolation" ON public.priority_rules
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 10.3 Billing Rules Table (ticket billing logic)
CREATE TABLE public.billing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_category text NOT NULL CHECK (ticket_category IN ('support', 'bug', 'feature_request', 'consultation')),
  client_tier text,
  billing_type text NOT NULL CHECK (billing_type IN ('warranty', 'retainer', 'ad_hoc', 'contract_covered', 'courtesy')),
  hourly_rate numeric(20,4),
  minimum_hours numeric(6,2) DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_billing_rules_tenant ON public.billing_rules(tenant_id);
CREATE INDEX idx_billing_rules_category ON public.billing_rules(ticket_category);

-- RLS
ALTER TABLE public.billing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.billing_rules;
CREATE POLICY "tenant_isolation" ON public.billing_rules
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 10.4 Tickets Table (core support entity)
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id),
  
  -- Ticket number (TKT-YYYY-MM-NNNN)
  ticket_number text NOT NULL UNIQUE,
  
  -- Links
  client_id uuid NOT NULL REFERENCES public.clients(id),
  submitted_by uuid REFERENCES public.user_profiles(id),
  project_id uuid REFERENCES public.projects(id),
  quotation_id uuid REFERENCES public.quotations(id),
  
  -- Channel
  channel text NOT NULL CHECK (channel IN ('portal', 'email', 'whatsapp', 'phone')),
  channel_reference text,
  
  -- Content
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('support', 'bug', 'feature_request', 'consultation')),
  category_auto boolean DEFAULT false,
  
  -- Priority
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  priority_score integer CHECK (priority_score BETWEEN 0 AND 100),
  priority_auto boolean DEFAULT false,
  
  -- Impact & Urgency
  impact text CHECK (impact IN ('critical', 'high', 'medium', 'low')),
  urgency text CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  
  -- Status workflow
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'pending_client', 'pending_internal', 'resolved', 'closed', 'cancelled')),
  assigned_to uuid REFERENCES public.user_profiles(id),
  
  -- SLA tracking
  sla_response_hours integer,
  sla_resolution_hours integer,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  sla_breached boolean DEFAULT false,
  
  -- Billing
  billable boolean DEFAULT true,
  billing_type text CHECK (billing_type IN ('warranty', 'retainer', 'ad_hoc', 'contract_covered', 'courtesy')),
  estimated_hours numeric(6,2),
  actual_hours numeric(6,2) DEFAULT 0,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX idx_tickets_tenant ON public.tickets(tenant_id);
CREATE INDEX idx_tickets_client ON public.tickets(client_id);
CREATE INDEX idx_tickets_project ON public.tickets(project_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_assigned ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_category ON public.tickets(category);

-- RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.tickets;
CREATE POLICY "tenant_isolation" ON public.tickets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

DROP POLICY IF EXISTS "assigned_user_access" ON public.tickets;
CREATE POLICY "assigned_user_access" ON public.tickets
  FOR SELECT
  USING (
    assigned_to = current_setting('app.current_user')::uuid
    OR created_by = current_setting('app.current_user')::uuid
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10.5 Ticket Time Logs
CREATE TABLE public.ticket_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  activity_type text NOT NULL CHECK (activity_type IN ('investigation', 'development', 'testing', 'communication', 'documentation', 'meeting')),
  description text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer NOT NULL,
  billable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ticket_time_logs_ticket ON public.ticket_time_logs(ticket_id);
CREATE INDEX idx_ticket_time_logs_user ON public.ticket_time_logs(user_id);

-- RLS
ALTER TABLE public.ticket_time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_time_logs" ON public.ticket_time_logs;
CREATE POLICY "tenant_isolation_time_logs" ON public.ticket_time_logs
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets WHERE tenant_id = current_setting('app.current_tenant')::uuid
    )
  );

-- Grant permissions
GRANT ALL ON public.priority_rules TO postgres;
GRANT ALL ON public.priority_rules TO anon;
GRANT ALL ON public.priority_rules TO authenticated;

GRANT ALL ON public.billing_rules TO postgres;
GRANT ALL ON public.billing_rules TO anon;
GRANT ALL ON public.billing_rules TO authenticated;

GRANT ALL ON public.tickets TO postgres;
GRANT ALL ON public.tickets TO anon;
GRANT ALL ON public.tickets TO authenticated;

GRANT ALL ON public.ticket_time_logs TO postgres;
GRANT ALL ON public.ticket_time_logs TO anon;
GRANT ALL ON public.ticket_time_logs TO authenticated;
