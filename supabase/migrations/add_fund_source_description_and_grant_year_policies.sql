-- Add description column to fund_sources
ALTER TABLE public.fund_sources ADD COLUMN IF NOT EXISTS description text;

-- Enable RLS on grant_years
ALTER TABLE public.grant_years ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to be safe/idempotent)
DROP POLICY IF EXISTS "Read access for all authenticated users" ON public.grant_years;
DROP POLICY IF EXISTS "Full access for super_admins" ON public.grant_years;

-- Create policies for grant_years

-- Everyone can read
CREATE POLICY "Read access for all authenticated users" ON public.grant_years
  FOR SELECT TO authenticated USING (true);

-- Super Admin: Full Access
CREATE POLICY "Full access for super_admins" ON public.grant_years
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');
