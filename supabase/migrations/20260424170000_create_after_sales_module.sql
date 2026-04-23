-- Migration: 20260424170000_create_after_sales_module.sql
-- Description: Create After Sales module tables - client relationship tracking, feedback/surveys, announcements
-- Dependencies: 0001 (tenants), 0002 (entities), 0005 (user_profiles), 0007 (clients), 00125 (projects), 00126 (tickets)

-- =====================================================================
-- 11.1 Client Relationship Logs (after-sales tracking)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.client_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Relationship health
  relationship_status text NOT NULL DEFAULT 'active' CHECK (relationship_status IN ('active', 'warm', 'cold', 'at_risk', 'dormant', 'churned')),
  relationship_score integer CHECK (relationship_score BETWEEN 0 AND 100), -- composite score
  last_interaction_date date,
  last_interaction_type text CHECK (last_interaction_type IN ('meeting', 'call', 'email', 'whatsapp', 'ticket_resolved', 'invoice_paid', 'visit')),

  -- Touchpoint tracking
  total_projects_completed integer DEFAULT 0,
  total_tickets_raised integer DEFAULT 0,
  total_invoices_sent integer DEFAULT 0,
  total_invoices_paid integer DEFAULT 0,
  total_revenue numeric(20,4) DEFAULT 0,

  -- Retainer status
  retainer_active boolean DEFAULT false,
  retainer_end_date date,
  retainer_monthly_hours numeric(6,2),

  -- Next planned touchpoint
  next_follow_up_date date,
  next_follow_up_type text CHECK (next_follow_up_type IN ('check_in', 'upsell_intro', 'feature_update', 'survey_send', 'meeting_scheduled')),
  next_follow_up_notes text,

  -- Assigned relationship owner
  relationship_owner_id uuid REFERENCES public.user_profiles(id),

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_relationships_tenant ON public.client_relationships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_client ON public.client_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_status ON public.client_relationships(tenant_id, relationship_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_relationships_owner ON public.client_relationships(relationship_owner_id);
CREATE INDEX IF NOT EXISTS idx_client_relationships_follow_up ON public.client_relationships(next_follow_up_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_relationships_score ON public.client_relationships(relationship_score);

-- RLS
ALTER TABLE public.client_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_relationships" ON public.client_relationships;
CREATE POLICY "tenant_isolation_relationships" ON public.client_relationships
  FOR ALL
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 11.2 Client Feedback / Surveys (CSAT & relationship pulse)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.client_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,

  -- Survey type
  survey_type text NOT NULL DEFAULT 'relationship' CHECK (survey_type IN ('relationship', 'project_completion', 'ticket_resolution', 'feature_introduction', 'general_satisfaction')),

  -- Responses
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),
  service_quality_rating integer CHECK (service_quality_rating BETWEEN 1 AND 5),
  communication_rating integer CHECK (communication_rating BETWEEN 1 AND 5),
  timeliness_rating integer CHECK (timeliness_rating BETWEEN 1 AND 5),
  value_for_money_rating integer CHECK (value_for_money_rating BETWEEN 1 AND 5),
  would_recommend boolean, -- NPS-like

  -- Open feedback
  positive_feedback text,
  improvement_suggestions text,
  missing_features text, -- what they wish we had
  competitor_mentions text[],

  -- Sentiment analysis (manual or auto)
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_confidence numeric(3,2), -- 0.00 to 1.00

  -- Survey metadata
  sent_at timestamptz,
  responded_at timestamptz,
  reminder_count integer DEFAULT 0,
  survey_link_token text UNIQUE, -- for external survey links

  -- Follow-up action
  follow_up_required boolean DEFAULT false,
  follow_up_assigned_to uuid REFERENCES public.user_profiles(id),
  follow_up_status text DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'in_progress', 'completed', 'no_action')),
  follow_up_notes text,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_tenant ON public.client_feedbacks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_client ON public.client_feedbacks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_project ON public.client_feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_ticket ON public.client_feedbacks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_type ON public.client_feedbacks(tenant_id, survey_type);
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_rating ON public.client_feedbacks(overall_rating);
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_sentiment ON public.client_feedbacks(tenant_id, sentiment) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_feedbacks_responded ON public.client_feedbacks(responded_at) WHERE responded_at IS NOT NULL;

-- RLS
ALTER TABLE public.client_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_feedbacks" ON public.client_feedbacks;
CREATE POLICY "tenant_isolation_feedbacks" ON public.client_feedbacks
  FOR ALL
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 11.3 Client Announcements (feature updates, broadcast to clients)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.client_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Content
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL, -- rich text / markdown
  summary text,
  category text CHECK (category IN ('feature_update', 'service_change', 'maintenance_notice', 'new_offering', 'announcement', 'event_invitation')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  tags text[],

  -- Targeting
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'enterprise', 'mid', 'small', 'prospect', 'active_retainer', 'at_risk')),
  specific_client_ids uuid[], -- if targeting specific clients (nullable)

  -- Delivery tracking
  published_at timestamptz,
  expires_at timestamptz,
  sent_via_email boolean DEFAULT false,
  sent_via_portal boolean DEFAULT true,
  sent_via_whatsapp boolean DEFAULT false,

  -- Engagement metrics
  views_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,

  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  scheduled_for timestamptz,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_announcements_tenant ON public.client_announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_announcements_status ON public.client_announcements(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_announcements_published ON public.client_announcements(published_at) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_client_announcements_target ON public.client_announcements(target_audience);

-- RLS
ALTER TABLE public.client_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_announcements" ON public.client_announcements;
CREATE POLICY "tenant_isolation_announcements" ON public.client_announcements
  FOR ALL
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 11.4 Client Announcement Reads (tracking who has read what)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.client_announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.client_announcements(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  read_at timestamptz DEFAULT now(),
  clicked_at timestamptz,
  UNIQUE(tenant_id, announcement_id, client_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON public.client_announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_client ON public.client_announcement_reads(client_id);

ALTER TABLE public.client_announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_announcement_reads" ON public.client_announcement_reads;
CREATE POLICY "tenant_isolation_announcement_reads" ON public.client_announcement_reads
  FOR ALL
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- =====================================================================
-- 11.5 Triggers
-- =====================================================================
DROP TRIGGER IF EXISTS update_client_relationships_updated_at ON public.client_relationships;
CREATE TRIGGER update_client_relationships_updated_at
  BEFORE UPDATE ON public.client_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_feedbacks_updated_at ON public.client_feedbacks;
CREATE TRIGGER update_client_feedbacks_updated_at
  BEFORE UPDATE ON public.client_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_announcements_updated_at ON public.client_announcements;
CREATE TRIGGER update_client_announcements_updated_at
  BEFORE UPDATE ON public.client_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 11.6 Grants
-- =====================================================================
GRANT ALL ON public.client_relationships TO postgres, anon, authenticated;
GRANT ALL ON public.client_feedbacks TO postgres, anon, authenticated;
GRANT ALL ON public.client_announcements TO postgres, anon, authenticated;
GRANT ALL ON public.client_announcement_reads TO postgres, anon, authenticated;
