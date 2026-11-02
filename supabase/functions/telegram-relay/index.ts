import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createRelay, type Inbox, type ReservedUpdate } from './relay.ts';

function inbox(): Inbox {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Relay unavailable');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async insert(updateId, chatId, payload) {
      const { error } = await client.from('telegram_inbox').upsert({
        update_id: updateId, chat_id: chatId, payload,
      }, { onConflict: 'update_id', ignoreDuplicates: true });
      if (error) throw new Error('Inbox unavailable');
    },
    async hasNewer(chatId, updateId) {
      const { data, error } = await client.from('telegram_inbox').select('update_id')
        .eq('chat_id', chatId).is('fired_at', null).gt('update_id', updateId).limit(1);
      if (error) throw new Error('Inbox unavailable');
      return Boolean(data?.length);
    },
    async claim(chatId) {
      const { data, error } = await client.rpc('telegram_relay_claim', { p_chat_id: chatId });
      if (error) throw new Error('Inbox unavailable');
      return (data ?? []) as ReservedUpdate[];
    },
    async release(ids) {
      if (!ids.length) return;
      const { error } = await client.from('telegram_inbox').update({ fired_at: null }).in('update_id', ids);
      if (error) throw new Error('Inbox unavailable');
    },
    async cleanup(before) {
      const { error } = await client.from('telegram_inbox').delete().lt('received_at', before);
      if (error) throw new Error('Inbox unavailable');
    },
  };
}

Deno.serve(createRelay({
  config: {
    webhookSecret: Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '',
    allowedChatIds: Deno.env.get('TELEGRAM_ALLOWED_CHAT_IDS') ?? '',
    routineUrl: Deno.env.get('ROUTINE_FIRE_URL') ?? '',
    routineToken: Deno.env.get('ROUTINE_FIRE_TOKEN') ?? '',
  },
  inbox,
  fetch,
  wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
  headers: corsHeaders,
}));