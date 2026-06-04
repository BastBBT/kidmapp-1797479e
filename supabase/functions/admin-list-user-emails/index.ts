import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'missing_auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await admin.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      console.error('getClaims failed', claimsErr?.message);
      return new Response(JSON.stringify({ error: 'invalid_auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { data: isAdminData, error: roleErr } = await admin.rpc('is_admin', { _user_id: userId });
    if (roleErr || !isAdminData) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.user_ids)
      ? body.user_ids.filter((x: any) => typeof x === 'string')
      : [];
    if (ids.length === 0) {
      return new Response(JSON.stringify({ emails: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emails: Record<string, string> = {};
    // Fetch emails directly per id (reliable, avoids pagination edge cases)
    await Promise.all(
      ids.map(async (id) => {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (!error && data?.user?.email) {
          emails[id] = data.user.email;
        } else if (error) {
          console.warn('getUserById failed', id, error.message);
        }
      })
    );

    return new Response(JSON.stringify({ emails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('admin-list-user-emails error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
