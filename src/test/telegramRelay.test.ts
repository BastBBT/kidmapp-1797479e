import { describe, expect, it, vi } from 'vitest';
import { acceptedUpdate, constantTimeEqual, createRelay, splitUpdates, type Inbox, type ReservedUpdate } from '../../supabase/functions/telegram-relay/relay.ts';

const payload = (id: number, text = 'bonjour', chatId = 123) => ({
  update_id: id, message: { chat: { id: chatId, type: 'private' }, text },
});
function harness(rows: ReservedUpdate[] = [{ update_id: 1, payload: payload(1) }]) {
  const inbox: Inbox = {
    insert: vi.fn().mockResolvedValue(undefined), hasNewer: vi.fn().mockResolvedValue(false),
    claim: vi.fn().mockResolvedValue(rows), release: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  const wait = vi.fn().mockResolvedValue(undefined);
  const logHttp = vi.fn();
  const factory = vi.fn(() => inbox);
  const handler = createRelay({
    config: { webhookSecret: 'test-only-secret', allowedChatIds: '123, 456', routineUrl: 'https://routine.example/fire', routineToken: 'test-only-token' },
    inbox: factory, fetch: fetcher, wait, logHttp, now: () => Date.parse('2026-11-02T22:27:00Z'),
  });
  const request = (body: unknown = payload(1), secret: string | null = 'test-only-secret', method = 'POST') => handler(new Request('https://relay.example', {
    method, headers: secret === null ? {} : { 'X-Telegram-Bot-Api-Secret-Token': secret },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  }));
  return { inbox, factory, fetcher, wait, logHttp, request };
}

describe('Telegram relay authentication and validation', () => {
  it('rejects non-POST before touching the inbox', async () => {
    const h = harness();
    expect((await h.request(undefined, null, 'GET')).status).toBe(405);
    expect(h.factory).not.toHaveBeenCalled();
  });
  it.each([null, '', 'wrong'])('rejects invalid secret without writing', async secret => {
    const h = harness();
    expect((await h.request(payload(1), secret)).status).toBe(401);
    expect(h.factory).not.toHaveBeenCalled();
  });
  it('compares equal and unequal secrets', async () => {
    expect(await constantTimeEqual('test', 'test')).toBe(true);
    expect(await constantTimeEqual('tesu', 'test')).toBe(false);
  });
  it.each([
    {}, { update_id: 1.5, message: payload(1).message },
    { update_id: 1, message: { chat: { id: 123, type: 'group' } } },
    payload(1, 'bonjour', 999), { update_id: 1, edited_message: payload(1).message },
  ])('ignores disallowed updates without writing', async body => {
    const h = harness();
    const result = await h.request(body);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true, ignored: true });
    expect(h.factory).not.toHaveBeenCalled();
  });
  it('accepts comma-separated private chat IDs', () => {
    expect(acceptedUpdate(payload(42, 'bonjour', 456), '123, 456')?.updateId).toBe(42);
  });
});

describe('Telegram grouping and routine delivery', () => {
  it('waits 15000ms, sends ordered payloads and deletes rows older than 7 days', async () => {
    const h = harness([{ update_id: 2, payload: payload(2) }, { update_id: 1, payload: payload(1) }]);
    const result = await h.request();
    expect(await result.json()).toEqual({ ok: true, fired: 2 });
    expect(h.inbox.insert).toHaveBeenCalledWith(1, 123, payload(1));
    expect(h.wait).toHaveBeenCalledWith(15000);
    const [url, options] = h.fetcher.mock.calls[0];
    expect(url).toBe('https://routine.example/fire');
    expect(options.headers['anthropic-version']).toBe('2026-10-21');
    expect(JSON.parse(options.body)).toEqual({ text: JSON.stringify([payload(1), payload(2)]) });
    expect(h.inbox.cleanup).toHaveBeenCalledWith('2026-10-26T22:27:00.000Z');
  });
  it('leaves the entire batch to a newer pending invocation', async () => {
    const h = harness();
    vi.mocked(h.inbox.hasNewer).mockResolvedValue(true);
    expect((await h.request()).status).toBe(200);
    expect(h.inbox.claim).not.toHaveBeenCalled();
    expect(h.fetcher).not.toHaveBeenCalled();
  });
  it('does not fire an already claimed batch on replay', async () => {
    const h = harness([]);
    expect((await h.request()).status).toBe(200);
    expect(h.fetcher).not.toHaveBeenCalled();
  });
  it('chunks at 60000 characters without splitting updates', () => {
    const rows = [1, 2, 3].map(id => ({ update_id: id, payload: payload(id, 'x'.repeat(31000)) }));
    const chunks = splitUpdates(rows);
    expect(chunks.map(chunk => chunk.map(row => row.update_id))).toEqual([[1], [2], [3]]);
    expect(chunks.every(chunk => JSON.stringify(chunk.map(row => row.payload)).length <= 60000)).toBe(true);
  });
  it.each([429, 500, 503])('releases only unsent chunks after HTTP %s', async status => {
    const rows = [1, 2, 3].map(id => ({ update_id: id, payload: payload(id, 'x'.repeat(31000)) }));
    const h = harness(rows);
    h.fetcher.mockResolvedValueOnce(new Response(null, { status: 200 })).mockResolvedValueOnce(new Response(null, { status }));
    expect((await h.request()).status).toBe(500);
    expect(h.inbox.release).toHaveBeenCalledWith([2, 3]);
    expect(h.fetcher).toHaveBeenCalledTimes(2);
    expect(h.logHttp).not.toHaveBeenCalled();
  });
  it('releases on network failure for Telegram retry', async () => {
    const h = harness();
    h.fetcher.mockRejectedValue(new Error('network'));
    expect((await h.request()).status).toBe(500);
    expect(h.inbox.release).toHaveBeenCalledWith([1]);
  });
  it.each([400, 401, 403])('acknowledges HTTP %s and logs only its code', async status => {
    const h = harness();
    h.fetcher.mockResolvedValue(new Response('private error body', { status }));
    expect((await h.request()).status).toBe(200);
    expect(h.inbox.release).toHaveBeenCalledWith([1]);
    expect(h.logHttp).toHaveBeenCalledExactlyOnceWith(status);
  });
  it('never exceeds the 65536 text limit for an indivisible update', async () => {
    const h = harness([{ update_id: 1, payload: payload(1, 'x'.repeat(65536)) }]);
    expect((await h.request()).status).toBe(200);
    expect(h.inbox.release).toHaveBeenCalledWith([1]);
    expect(h.fetcher).not.toHaveBeenCalled();
  });
});