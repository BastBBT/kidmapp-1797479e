import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STORAGE_BUCKET = 'location-photos';

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

    // Erasure must never report success on a partial run: every step that removes
    // or anonymizes personal data is fatal. A failure aborts BEFORE the auth user
    // is deleted, so the rows keep an identifiable owner and the call can be retried.
    // Deleting the auth user first would orphan them beyond recovery.
    const failures: string[] = [];
    const fatal = (step: string, error: unknown) => {
      console.error(`delete-account: ${step} failed`, error);
      failures.push(step);
    };

    // 1. Audit log — proof the erasure request was handled. Non-fatal on its own:
    //    losing the trace must not block the user's right to be erased.
    const { error: logErr } = await admin
      .from('account_deletions')
      .insert({ user_id: userId, email, reason });
    if (logErr) console.error('account_deletions insert error (non-fatal)', logErr);

    // 2. Admin notification — cosmetic, never blocks an erasure.
    const { error: notifErr } = await admin.from('admin_notifications').insert({
      type: 'account_deletion',
      payload: { email, userId, date: new Date().toISOString(), reason },
    });
    if (notifErr) console.error('admin_notifications insert error (non-fatal)', notifErr);

    // 3. Anonymize contributions (keep equipment votes for public stats)
    const { error: anonErr } = await admin
      .from('contributions')
      .update({ user_id: null })
      .eq('user_id', userId);
    if (anonErr) fatal('contributions.anonymize', anonErr);

    // 4. Storage: drop the user's uploads, except files still referenced by
    //    published content (an approved proposal's photo belongs to the public
    //    location record, and contributions are anonymized rather than removed).
    try {
      const referenced = new Set<string>();
      for (const table of ['locations', 'events'] as const) {
        const { data, error } = await admin
          .from(table)
          .select('photo')
          .like('photo', `%/${userId}/%`);
        if (error) throw error;
        for (const row of data ?? []) {
          if (row.photo) referenced.add(row.photo as string);
        }
      }

      const orphans: string[] = [];
      for (const prefix of [`proposals/${userId}`, `events/${userId}`]) {
        // Paginate: list() caps at 100 rows by default and silently truncates.
        for (let offset = 0; ; offset += 100) {
          const { data: files, error } = await admin.storage
            .from(STORAGE_BUCKET)
            .list(prefix, { limit: 100, offset });
          if (error) throw error;
          for (const file of files ?? []) {
            const path = `${prefix}/${file.name}`;
            const { data: urlData } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
            if (!referenced.has(urlData.publicUrl)) orphans.push(path);
          }
          if (!files || files.length < 100) break;
        }
      }

      if (orphans.length > 0) {
        const { error: rmErr } = await admin.storage.from(STORAGE_BUCKET).remove(orphans);
        if (rmErr) throw rmErr;
      }
      console.log('delete-account: storage purged', {
        removed: orphans.length,
        keptReferenced: referenced.size,
      });
    } catch (e) {
      fatal('storage.purge', e);
    }

    // 5. Cleanup user-owned data.
    //    favorites / event_favorites / event_feedback / point_events / profiles all
    //    cascade from auth.users; the explicit deletes below cover the tables whose
    //    FK is missing, and stay as harmless no-ops once the cascade migration lands.
    const { error: favErr } = await admin.from('favorites').delete().eq('user_id', userId);
    if (favErr) fatal('favorites.delete', favErr);

    const { error: propErr } = await admin
      .from('location_proposals')
      .delete()
      .eq('user_id', userId);
    if (propErr) fatal('location_proposals.delete', propErr);

    // Browsing history: no FK to auth.users, so it survives deleteUser unless removed here.
    const { error: viewsErr } = await admin.from('page_views').delete().eq('user_id', userId);
    if (viewsErr) fatal('page_views.delete', viewsErr);

    const { error: profErr } = await admin.from('profiles').delete().eq('id', userId);
    if (profErr) fatal('profiles.delete', profErr);

    // 6. Abort before the point of no return if anything above failed.
    if (failures.length > 0) {
      console.error('delete-account: aborted, auth user kept', { userId, failures });
      return new Response(
        JSON.stringify({
          error: 'Erasure incomplete, account preserved so it can be retried',
          failedSteps: failures,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 7. Delete auth user
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
