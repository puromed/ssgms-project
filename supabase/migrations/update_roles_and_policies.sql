-- 1. Update the check constraint for profiles.role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'super_admin'));

-- 2. Drop existing policies to start fresh
-- Grant Sources
DROP POLICY IF EXISTS "Enable read access for all users" ON public.fund_sources;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.fund_sources;
DROP POLICY IF EXISTS "Enable update for admins" ON public.fund_sources;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.fund_sources;
DROP POLICY IF EXISTS "Read access for all authenticated users" ON public.fund_sources;
DROP POLICY IF EXISTS "Full access for super_admins" ON public.fund_sources;

-- Grants
DROP POLICY IF EXISTS "Enable read access for all users" ON public.grants;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.grants;
DROP POLICY IF EXISTS "Enable update for admins" ON public.grants;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.grants;
DROP POLICY IF EXISTS "Read access for all authenticated users" ON public.grants;
DROP POLICY IF EXISTS "Full access for super_admins" ON public.grants;
DROP POLICY IF EXISTS "Insert for admins" ON public.grants;
DROP POLICY IF EXISTS "Update for admins" ON public.grants;
DROP POLICY IF EXISTS "Update for admins and users" ON public.grants;

-- Disbursements
DROP POLICY IF EXISTS "Enable read access for all users" ON public.disbursements;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.disbursements;
DROP POLICY IF EXISTS "Enable update for admins" ON public.disbursements;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.disbursements;
DROP POLICY IF EXISTS "Read access for all authenticated users" ON public.disbursements;
DROP POLICY IF EXISTS "Full access for super_admins" ON public.disbursements;
DROP POLICY IF EXISTS "Insert for admins" ON public.disbursements;
DROP POLICY IF EXISTS "Update for admins" ON public.disbursements;

-- Profiles
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Read access for all authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Full access for super_admins" ON public.profiles;
DROP POLICY IF EXISTS "Insert for admins" ON public.profiles;
DROP POLICY IF EXISTS "Update for admins" ON public.profiles;

-- 3. Create New Policies

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql
SECURITY DEFINER
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- --- Fund Sources ---
-- Everyone can read
CREATE POLICY "Read access for all authenticated users" ON public.fund_sources
  FOR SELECT TO authenticated USING (true);

-- Super Admin: Full Access
CREATE POLICY "Full access for super_admins" ON public.fund_sources
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- --- Grants ---
-- Everyone can read
CREATE POLICY "Read access for all authenticated users" ON public.grants
  FOR SELECT TO authenticated USING (true);

-- Super Admin: Full Access
CREATE POLICY "Full access for super_admins" ON public.grants
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- Admin: Insert
CREATE POLICY "Insert for admins" ON public.grants
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');

-- Admin and User: Update
CREATE POLICY "Update for admins and users" ON public.grants
  FOR UPDATE TO authenticated USING (get_my_role() IN ('admin', 'user'));

-- --- Disbursements ---
-- Everyone can read
CREATE POLICY "Read access for all authenticated users" ON public.disbursements
  FOR SELECT TO authenticated USING (true);

-- Super Admin: Full Access
CREATE POLICY "Full access for super_admins" ON public.disbursements
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- Admin: Insert/Update (Cannot Delete)
CREATE POLICY "Insert for admins" ON public.disbursements
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Update for admins" ON public.disbursements
  FOR UPDATE TO authenticated USING (get_my_role() = 'admin');


-- --- Profiles ---
-- Read all
CREATE POLICY "Read access for all authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Super Admin: Full Access
CREATE POLICY "Full access for super_admins" ON public.profiles
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- Note: Admin profile management is restricted at the application level (Team page uses SuperAdminGuard).
-- Therefore, we intentionally do NOT grant admins direct INSERT/UPDATE privileges on profiles here.
-- This follows the principle of least privilege.
