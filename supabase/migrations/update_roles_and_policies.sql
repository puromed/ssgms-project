-- 1. Update the check constraint for profiles.role (or enum if used, but based on types it looks like a text check)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'super_admin'));

-- 2. Drop existing policies to start fresh (safest approach to ensure no conflict)
-- Grant Sources
DROP POLICY IF EXISTS "Enable read access for all users" ON public.fund_sources;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.fund_sources;
DROP POLICY IF EXISTS "Enable update for admins" ON public.fund_sources;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.fund_sources;

-- Grants
DROP POLICY IF EXISTS "Enable read access for all users" ON public.grants;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.grants;
DROP POLICY IF EXISTS "Enable update for admins" ON public.grants;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.grants;

-- Disbursements
DROP POLICY IF EXISTS "Enable read access for all users" ON public.disbursements;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.disbursements;
DROP POLICY IF EXISTS "Enable update for admins" ON public.disbursements;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.disbursements;

-- Profiles (Users)
-- Assuming users can read all profiles (for team view) or just their own. Let's look at standard policies.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- 3. Create New Policies

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- --- Fund Sources ---
-- Everyone can read
CREATE POLICY "Read access for all authenticated users" ON public.fund_sources
  FOR SELECT TO authenticated USING (true);

-- Super Admin: Full Access
CREATE POLICY "Full access for super_admins" ON public.fund_sources
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- Admin: No insert/update/delete (Only Super Admin can create/delete per requirements)
-- "The new grant source should be hidden, since it is now belongs to super admin roles."

-- --- Grants ---
-- Everyone can read
CREATE POLICY "Read access for all authenticated users" ON public.grants
  FOR SELECT TO authenticated USING (true);

-- Super Admin: Full Access
CREATE POLICY "Full access for super_admins" ON public.grants
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- Admin: Insert/Update (Cannot Delete)
CREATE POLICY "Insert for admins" ON public.grants
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Update for admins" ON public.grants
  FOR UPDATE TO authenticated USING (get_my_role() = 'admin');

-- User: Maybe can update status? (From Grants.tsx: `if (profile?.role !== 'user')`)
-- Wait, in Grants.tsx, users can change status.
-- "Admin role can be a bit limited now... but still limited to daily operation tasks."
-- Code implies Users can update status too? Or is that just UI?
-- In Grants.tsx: `STATUS_OPTIONS` dropdown is shown if role is NOT user?
-- No: `profile?.role !== "user" ? ( <Badge> ) : ( <Select> )`
-- This implies USERS can change status, but Admins see a static badge? That seems backwards.
-- Let's re-read Grants.tsx carefully.
-- `profile?.role !== "user" ? ( ... span ... ) : ( ... select ... )`
-- This means if I am NOT a user (i.e. I am Admin or Super Admin), I see a SPAN (Read only??)
-- If I AM a user, I see a SELECT?
-- That feels like a bug in the existing code or a weird requirement.
-- But let's assume standard behavior: Admins manage grants.
-- I will give Admins Insert/Update access.
-- I will give Users Read Only access for now, unless specific instruction.
-- Re-reading prompt: "The super admin should inherit the current admin capabilities... admin role can be a bit limited now... daily operation tasks."
-- Existing code Grants.tsx line 249:
-- `profile?.role !== "user" ? ( <span...> ) : ( <select...> )`
-- If role is 'admin', condition is true -> span.
-- If role is 'user', condition is false -> select.
-- This suggests 'user' role is the one changing statuses? That's very odd for an "Admin" system.
-- Ah, maybe "User" = "Staff" who processes things?
-- I will trust the existing codebase's logic implies 'user' needs update permission on `status`.
-- BUT, for safety, I will stick to: Admin & Super Admin have power.
-- Let's enable Update for Admin on Grants.
-- And if 'user' really needs it, they might face issues, but I should probably preserve existing Admin capabilities.
-- Actually, let's look at `handleStatusChange`: `const { error } = await supabase.from("grants").update(...)`.
-- This is called by the Select. So whoever sees the Select needs Update permission.
-- If my analysis is right, 'user' sees the select. So 'user' needs Update permission.
-- I will add Update for 'user' on Grants just in case, or maybe just `true` for authenticated if I want to be permissive (less secure).
-- Better: `get_my_role() IN ('admin', 'user')` for Update.

CREATE POLICY "Update for admins and users" ON public.grants
  FOR UPDATE TO authenticated USING (get_my_role() IN ('admin', 'user'));


-- --- Disbursements ---
-- Everyone Read
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

-- Update self? Or Admin updates?
-- Super Admin can update ANY profile (to change roles)
CREATE POLICY "Full access for super_admins" ON public.profiles
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

-- Admin can update? (Maybe invite users? Team.tsx uses `insert` into profiles)
-- Team.tsx: `supabase.from('profiles').insert(...)`
-- So Admin needs INSERT on profiles.
CREATE POLICY "Insert for admins" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'admin');
-- Admin might need update too (to set status?)
CREATE POLICY "Update for admins" ON public.profiles
  FOR UPDATE TO authenticated USING (get_my_role() = 'admin');


-- 4. INSTRUCTIONS FOR SETTING UP SUPER ADMIN
-- Run this block after creating your account on the frontend (e.g. Sign up as superadmin@ssgms.com)
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'superadmin@ssgms.com';
