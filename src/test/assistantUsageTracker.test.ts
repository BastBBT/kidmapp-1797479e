import { describe, it, expect, beforeEach, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock },
}));

import { recordAssistantOpened, recordAssistantCompleted } from '@/lib/assistantUsageTracker';

describe('assistantUsageTracker', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('recordAssistantOpened appelle la RPC record_assistant_opened', async () => {
    rpcMock.mockResolvedValue({ error: null });
    await recordAssistantOpened();
    expect(rpcMock).toHaveBeenCalledWith('record_assistant_opened');
  });

  it('recordAssistantCompleted appelle la RPC record_assistant_completed', async () => {
    rpcMock.mockResolvedValue({ error: null });
    await recordAssistantCompleted();
    expect(rpcMock).toHaveBeenCalledWith('record_assistant_completed');
  });

  it('avale silencieusement une erreur renvoyée par Supabase (ex. visiteur anonyme, RPC réservée à authenticated)', async () => {
    rpcMock.mockResolvedValue({ error: new Error('permission denied for function record_assistant_opened') });
    await expect(recordAssistantOpened()).resolves.toBeUndefined();
  });

  it('avale silencieusement un rejet réseau, sans retry', async () => {
    rpcMock.mockRejectedValue(new Error('network down'));
    await expect(recordAssistantCompleted()).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });
});
