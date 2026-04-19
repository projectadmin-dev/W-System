-- =====================================================
-- FASE-1: CRM Module (Leads Management)
-- =====================================================
-- Lead pipeline with scoring & SLA tracking
-- Based on USER_STORIES v3.0 § 2.2 (US-Q2C-002)
-- =====================================================

-- 7.1 Scoring Rules Table (configurable lead scoring)
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  component text NOT NULL CHECK (component IN (
    'budget_disclosed', 'authority_level', 'need_definition', 
    'timeline', 'engagement_score'
  )),
  weight integer NOT NULL CHECK (weight BETWEEN 0 AND 100),
  rules jsonb NOT NULL, -- scoring mapping, e.g. {"unknown":0,"range":15,"exact":25}
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7.2 Seed default scoring rules (per USER_STORIES v3.0)
INSERT INTO public.scoring_rules (tenant_id, component, weight, rules) 
SELECT 
  t.id,
  sr.component,
  sr.weight,
  sr.rules
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('budget_disclosed', 25, '{"unknown":0,"range":15,"exact":25}'::jsonb),
    ('authority_level', 25, '{"influencer":5,"manager":15,"c_level":25}'::jsonb),
    ('need_definition', 20, '{"scale":"0-20"}'::jsonb),
    ('timeline', 15, '{"unknown":0,"within_6mo":8,"within_3mo":15}'::jsonb),
    ('engagement_score', 15, '{"scale":"0-15"}'::jsonb)
) AS sr(component, weight, rules)
ON CONFLICT DO NOTHING;

-- 7.3 SLA Configs Table (stage transition timelines)
CREATE TABLE IF NOT EXISTS public.sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stage_from text NOT NULL CHECK (stage_from IN ('cold', 'warm', 'hot')),
  stage_to text NOT NULL CHECK (stage_to IN ('warm', 'hot', 'deal')),
  duration_hours integer NOT NULL,
  escalation_role text, -- role to notify on breach
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7.4 Seed default SLA configs (per USER_STORIES v3.0)
INSERT INTO public.sla_configs (tenant_id, stage_from, stage_to, duration_hours, escalation_role)
SELECT 
  t.id,
  cfg.stage_from,
  cfg.stage_to,
  cfg.duration_hours,
  cfg.escalation_role
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('cold', 'warm', 168, 'marketing_lead'), -- 7 days
    ('warm', 'hot', 336, 'commercial_director'), -- 14 days
    ('hot', 'deal', 720, 'commercial_director') -- 30 days
) AS cfg(stage_from, stage_to, duration_hours, escalation_role)
ON CONFLICT DO NOTHING;

-- 7.5 Leads Table (core CRM entity)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  entity_id uuid REFERENCES public.entities(id),
  
  -- Basic info
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  company_name text,
  job_title text,
  
  -- Source tracking
  source text NOT NULL CHECK (source IN (
    'referral', 'digital_ads', 'event', 'partner', 'inbound', 'outbound'
  )),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referring_client_id uuid REFERENCES public.clients(id),
  event_id text,
  
  -- Scoring components (per USER_STORIES v3.0 § 2.2)
  budget_disclosed text CHECK (budget_disclosed IN ('unknown', 'range', 'exact')),
  authority_level text CHECK (authority_level IN ('influencer', 'manager', 'c_level')),
  need_definition integer CHECK (need_definition BETWEEN 0 AND 20),
  timeline text CHECK (timeline IN ('unknown', 'within_6mo', 'within_3mo')),
  engagement_score integer CHECK (engagement_score BETWEEN 0 AND 15),
  
  -- Computed total score (0-100)
  total_score integer CHECK (total_score BETWEEN 0 AND 100),
  score_calculated_at timestamptz,
  
  -- Pipeline stage
  stage text NOT NULL DEFAULT 'cold' CHECK (stage IN ('cold', 'warm', 'hot', 'deal')),
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  previous_stage text,
  
  -- SLA tracking
  sla_deadline_at timestamptz,
  sla_breached boolean NOT NULL DEFAULT false,
  sla_breached_at timestamptz,
  last_activity_at timestamptz,
  
  -- Ownership
  current_pic_id uuid NOT NULL REFERENCES public.user_profiles(id),
  marketing_pic_id uuid REFERENCES public.user_profiles(id),
  commercial_pic_id uuid REFERENCES public.user_profiles(id),
  
  -- Metadata
  tags text[],
  notes text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 7.6 Indexes
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(tenant_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sla ON leads(sla_deadline_at) 
  WHERE sla_breached = false AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(tenant_id, total_score) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_pic ON leads(current_pic_id);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);

-- 7.7 Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 7.8 RLS Policies

-- Marketing: full access to tenant's leads
DROP POLICY IF EXISTS "marketing_manage_leads" ON public.leads;
CREATE POLICY "marketing_manage_leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  );

-- Commercial: read all tenant leads (for handover context)
DROP POLICY IF EXISTS "commercial_read_leads" ON public.leads;
CREATE POLICY "commercial_read_leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director')
    )
  );

-- Commercial: update leads they own (as commercial_pic)
DROP POLICY IF EXISTS "commercial_update_own_leads" ON public.leads;
CREATE POLICY "commercial_update_own_leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND commercial_pic_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND commercial_pic_id = auth.uid()
  );

-- CEO/CFO: read all for strategic visibility
DROP POLICY IF EXISTS "exec_read_leads" ON public.leads;
CREATE POLICY "exec_read_leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('ceo', 'cfo')
    )
  );

-- PM: read leads converted to deals
DROP POLICY IF EXISTS "pm_read_deal_leads" ON public.leads;
CREATE POLICY "pm_read_deal_leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND stage = 'deal'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

-- 7.9 Lead Activities Table (audit trail of interactions)
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'call', 'email', 'meeting', 'demo', 'proposal_sent', 
    'follow_up', 'note', 'stage_changed', 'score_updated'
  )),
  subject text,
  description text,
  outcome text,
  next_step text,
  next_step_due_at timestamptz,
  
  -- Metadata
  channel text CHECK (channel IN ('phone', 'email', 'whatsapp', 'zoom', 'in_person')),
  duration_minutes integer,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ownership
  performed_by uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 7.10 Indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON lead_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_performed_by ON lead_activities(performed_by);
CREATE INDEX IF NOT EXISTS idx_lead_activities_recent ON lead_activities(lead_id, recorded_at DESC);

-- 7.11 Enable RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- 7.12 RLS Policies for Lead Activities

-- Marketing: full access
DROP POLICY IF EXISTS "marketing_manage_lead_activities" ON public.lead_activities;
CREATE POLICY "marketing_manage_lead_activities"
  ON public.lead_activities FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  );

-- Commercial: read + insert (for handover notes)
DROP POLICY IF EXISTS "commercial_read_insert_activities" ON public.lead_activities;
CREATE POLICY "commercial_read_insert_activities"
  ON public.lead_activities FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director')
    )
  );

-- 7.13 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS lead_activities_updated_at ON lead_activities;
CREATE TRIGGER lead_activities_updated_at
  BEFORE UPDATE ON lead_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7.14 Function: Calculate lead score
CREATE OR REPLACE FUNCTION public.calculate_lead_score(lead_id uuid)
RETURNS integer AS $$
DECLARE
  lead_record RECORD;
  score integer := 0;
  rule_record RECORD;
BEGIN
  -- Get lead data
  SELECT * INTO lead_record FROM public.leads WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Budget disclosed (25 pts)
  SELECT weight * (rules->>lead_record.budget_disclosed)::integer / 25
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'budget_disclosed' AND tenant_id = lead_record.tenant_id;
  
  -- Authority level (25 pts)
  SELECT weight * (rules->>lead_record.authority_level)::integer / 25
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'authority_level' AND tenant_id = lead_record.tenant_id;
  
  -- Need definition (20 pts)
  SELECT weight * lead_record.need_definition / 20
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'need_definition' AND tenant_id = lead_record.tenant_id;
  
  -- Timeline (15 pts)
  SELECT weight * (rules->>lead_record.timeline)::integer / 15
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'timeline' AND tenant_id = lead_record.tenant_id;
  
  -- Engagement score (15 pts)
  SELECT weight * lead_record.engagement_score / 15
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'engagement_score' AND tenant_id = lead_record.tenant_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
