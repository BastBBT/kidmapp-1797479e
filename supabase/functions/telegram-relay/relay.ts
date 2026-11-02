export const GROUP_DELAY_MS = 15_000;
export const CHUNK_TARGET = 60_000;
export const TEXT_LIMIT = 65_536;
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type Payload = Record<string, unknown>;
export type ReservedUpdate = { update_id: number; payload: Payload };
export interface Inbox {
  insert(updateId: number, chatId: number, payload: Payload): Promise<void>;
  hasNewer(chatId: number, updateId: number): Promise<boolean>;
  claim(chatId: number): Promise<ReservedUpdate[]>;
  release(ids: number[]): Promise<void>;
  cleanup(before: string): Promise<void>;
}
export interface RelayConfig {
  webhookSecret: string;
  allowedChatIds: string;
  routineUrl: string;
  routineToken: string;
}

// Fixed-size digests avoid a length-dependent comparison of supplied secrets.
export async function constantTimeEqual(actual: string | null, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual ?? '')),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0 && actual !== null;
}

function object(value: unknown): value is Payload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function acceptedUpdate(value: unknown, allowed: string): { updateId: number; chatId: number; payload: Payload } | null {
  if (!object(value) || !Number.isSafeInteger(value.update_id) || !object(value.message)) return null;
  const chat = value.message.chat;
  if (!object(chat) || chat.type !== 'private' || !Number.isSafeInteger(chat.id)) return null;
  const ids = new Set(allowed.split(',').map(id => id.trim()).filter(Boolean));
  if (!ids.has(String(chat.id))) return null;
  return { updateId: value.update_id as number, chatId: chat.id as number, payload: value };
}

export function splitUpdates(rows: ReservedUpdate[]): ReservedUpdate[][] {
  const chunks: ReservedUpdate[][] = [];
  let current: ReservedUpdate[] = [];
  for (const row of [...rows].sort((a, b) => a.update_id - b.update_id)) {
    if (JSON.stringify([row.payload]).length > TEXT_LIMIT) throw new Error('Oversized update');
    if (current.length && JSON.stringify([...current, row].map(item => item.payload)).length > CHUNK_TARGET) {
      chunks.push(current);
      current = [];
    }
    current.push(row);
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function createRelay(deps: {
  config: RelayConfig;
  inbox: () => Inbox;
  fetch: typeof fetch;
  wait: (ms: number) => Promise<void>;
  now?: () => number;
  logHttp?: (status: number) => void;
  headers?: Record<string, string>;
}) {
  const respond = (status: number, body: Payload) => new Response(JSON.stringify(body), {
    status, headers: { ...deps.headers, 'Content-Type': 'application/json' },
  });
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return respond(405, { error: 'Method not allowed' });
    const config = deps.config;
    if (!config.webhookSecret) return respond(500, { error: 'Relay unavailable' });
    if (!await constantTimeEqual(req.headers.get('X-Telegram-Bot-Api-Secret-Token'), config.webhookSecret)) {
      return respond(401, { error: 'Unauthorized' });
    }
    let body: unknown;
    try { body = await req.json(); } catch { return respond(200, { ok: true, ignored: true }); }
    const update = acceptedUpdate(body, config.allowedChatIds);
    if (!update) return respond(200, { ok: true, ignored: true });
    try {
      if (!config.routineToken || new URL(config.routineUrl).protocol !== 'https:') {
        return respond(500, { error: 'Relay unavailable' });
      }
    } catch { return respond(500, { error: 'Relay unavailable' }); }
    let inbox: Inbox;
    try { inbox = deps.inbox(); } catch { return respond(500, { error: 'Relay unavailable' }); }
    let unsent: number[] = [];
    try {
      await inbox.insert(update.updateId, update.chatId, update.payload);
      await deps.wait(GROUP_DELAY_MS);
      if (await inbox.hasNewer(update.chatId, update.updateId)) return respond(200, { ok: true });
      const rows = await inbox.claim(update.chatId);
      unsent = rows.map(row => row.update_id);
      if (!rows.length) return respond(200, { ok: true });
      let chunks: ReservedUpdate[][];
      try { chunks = splitUpdates(rows); } catch {
        await inbox.release(unsent);
        unsent = [];
        return respond(200, { ok: true, fired: 0 });
      }
      for (const chunk of chunks) {
        const response = await deps.fetch(config.routineUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.routineToken}`,
            'anthropic-version': '2026-10-21',
            'Content-Type': 'application/json',
          },
          redirect: 'error',
          body: JSON.stringify({ text: JSON.stringify(chunk.map(row => row.payload)) }),
        });
        // Never read or log the routine response body.
        if (!response.ok) {
          await response.body?.cancel();
          await inbox.release(unsent);
          unsent = [];
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            (deps.logHttp ?? console.error)(response.status);
            return respond(200, { ok: true });
          }
          return respond(500, { error: 'Routine unavailable' });
        }
        await response.body?.cancel();
        const sentIds = new Set(chunk.map(row => row.update_id));
        unsent = unsent.filter(id => !sentIds.has(id));
      }
      return respond(200, { ok: true, fired: rows.length });
    } catch {
      if (unsent.length) {
        try { await inbox.release(unsent); } catch { /* Never log database errors or payloads. */ }
      }
      return respond(500, { error: 'Relay unavailable' });
    } finally {
      try { await inbox.cleanup(new Date((deps.now ?? Date.now)() - RETENTION_MS).toISOString()); }
      catch { /* Cleanup is best effort and never logs message data. */ }
    }
  };
}