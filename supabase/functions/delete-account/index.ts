import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = authHeader.replace('Bearer ', '');

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate token via service-role client
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('Auth error', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;
    const email = userData.user.email ?? null;
    console.log('delete-account: starting', { userId, email });

    let reason: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.reason === 'string') reason = body.reason.slice(0, 1000);
    } catch (_) {}

    // 1. Audit log
    const { error: logErr } = await admin
      .from('account_deletions')
      .insert({ user_id: userId, email, reason });
    if (logErr) console.error('account_deletions insert error', logErr);

    // 2. Admin notification
    const { error: notifErr } = await admin.from('admin_notifications').insert({
      type: 'account_deletion',
      payload: { email, userId, date: new Date().toISOString(), reason },
    });
    if (notifErr) console.error('admin_notifications insert error', notifErr);

    // 3. Anonymize contributions (keep equipment votes for public stats)
    const { error: anonErr } = await admin
      .from('contributions')
      .update({ user_id: null })
      .eq('user_id', userId);
    if (anonErr) console.error('contributions anonymize error', anonErr);

    // 4. Cleanup user-owned data
    const { error: favErr } = await admin.from('favorites').delete().eq('user_id', userId);
    if (favErr) console.error('favorites delete error', favErr);

    const { error: propErr } = await admin
      .from('location_proposals')
      .delete()
      .eq('user_id', userId);
    if (propErr) console.error('location_proposals delete error', propErr);

    const { error: profErr } = await admin.from('profiles').delete().eq('id', userId);
    if (profErr) console.error('profiles delete error', profErr);

    // 5. Delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('auth.admin.deleteUser error', delErr);
      return new Response(JSON.stringify({ error: `deleteUser failed: ${delErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('delete-account: success', { userId });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('delete-account: unexpected error', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
