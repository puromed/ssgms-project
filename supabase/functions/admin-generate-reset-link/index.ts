import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type RequestBody = {
  email: string;
  redirectTo?: string;
};

type ResponseBody =
  | { actionLink: string }
  | { error: string };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: ResponseBody) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json(401, { error: 'Missing Authorization bearer token' });

    const { email, redirectTo } = (await req.json()) as RequestBody;
    if (!email) return json(400, { error: 'Missing email' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) return json(401, { error: 'Invalid session' });

    const requesterId = userData.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', requesterId)
      .maybeSingle();

    if (profileError) return json(500, { error: 'Failed to verify admin role' });
    if (profile?.role !== 'super_admin') return json(403, { error: 'Forbidden: super_admin only' });

    const effectiveRedirectTo = redirectTo?.trim();
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: effectiveRedirectTo ? { redirectTo: effectiveRedirectTo } : undefined,
    });

    if (error) return json(400, { error: error.message });
    const actionLink = data?.properties?.action_link;
    if (!actionLink) return json(500, { error: 'Failed to generate link' });

    return json(200, { actionLink });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json(500, { error: message });
  }
});
