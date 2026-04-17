-- =====================================================
-- W-System Login Module - Database Schema
-- =====================================================
-- Paste this entire script in Supabase Dashboard → SQL Editor
-- Then click "Run" to execute all statements
-- =====================================================

-- =====================================================
-- 1. TABLES
-- =====================================================

-- 1.1 Profiles (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  username text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.2 OAuth Accounts (for Google, GitHub, etc.)
CREATE TABLE IF NOT EXISTS public.oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  access_token_enc text,
  refresh_token_enc text,
  token_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

-- 1.3 User Roles (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, role)
);

-- =====================================================
-- 2. INDEXES (for performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- =====================================================
-- 3. TRIGGERS & FUNCTIONS
-- =====================================================

-- 3.1 Function: Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Assign default 'viewer' role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (NEW.id, 'viewer', NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Trigger: Call handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.3 Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.4 Trigger: Auto-update updated_at on profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- 4.1 Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4.2 PROFILES Policies
-- =====================================================

-- Users can view own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert own profile (for trigger)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- =====================================================
-- 4.3 OAUTH_ACCOUNTS Policies
-- =====================================================

-- Users can view own OAuth accounts
DROP POLICY IF EXISTS "Users can view own OAuth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can view own OAuth accounts"
  ON public.oauth_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own OAuth accounts
DROP POLICY IF EXISTS "Users can insert own OAuth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can insert own OAuth accounts"
  ON public.oauth_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own OAuth accounts
DROP POLICY IF EXISTS "Users can delete own OAuth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can delete own OAuth accounts"
  ON public.oauth_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4.4 USER_ROLES Policies
-- =====================================================

-- Users can view own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins can manage roles (insert/update/delete)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS (optional but useful)
-- =====================================================

-- 5.1 Function: Get current user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles()
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT role FROM public.user_roles
    WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Function: Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Function: Get current user's profile
CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS public.profiles AS $$
BEGIN
  RETURN (
    SELECT p.* FROM public.profiles p
    WHERE p.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Allow public to call helper functions
GRANT EXECUTE ON FUNCTION public.get_user_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_profile() TO authenticated;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- You can now:
-- 1. Sign up users via Supabase Auth
-- 2. Profiles will be auto-created
-- 3. Default 'viewer' role will be assigned
-- 4. RLS policies will protect data
-- =====================================================
