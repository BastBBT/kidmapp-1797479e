import { describe, expect, it, vi } from 'vitest';
import { normalizeBusinessStatus, writeGoogleUpdate } from '../../supabase/functions/sync-opening-hours/update.ts';

describe('Google business status', () => {
  it.each(['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'])('preserves %s', (status) => {
    expect(normalizeBusinessStatus(status)).toBe(status);
  });
  it.each([undefined, null, '', 'UNKNOWN', 'operational', 1])('stores unknown %s as null', (value) => {
    expect(normalizeBusinessStatus(value)).toBeNull();
  });
});

function client(written: { id: string }[], failStatus = false) {
  const select = vi.fn().mockResolvedValue({ data: written, error: null });
  const or = vi.fn(() => ({ select }));
  const eq = vi.fn()
    .mockReturnValueOnce({ or, select })
    .mockResolvedValueOnce({ error: failStatus ? { message: 'failed' } : null });
  const update = vi.fn(() => ({ eq }));
  const admin = { from: vi.fn(() => ({ update })) };
  return { admin, update, or };
}

describe('Google writes with manual hours', () => {
  const update = { business_status: 'CLOSED_TEMPORARILY', opening_hours: null, opening_hours_source: 'google_auto' };
  it('refreshes only business_status when the hours guard excludes a manual location', async () => {
    const mock = client([]);
    expect(await writeGoogleUpdate(mock.admin as never, 'manual-id', update, false)).toBe('skipped_manual');
    expect(mock.or).toHaveBeenCalledWith('opening_hours_source.is.null,opening_hours_source.neq.manuel');
    expect(mock.update.mock.calls).toEqual([[update], [{ business_status: 'CLOSED_TEMPORARILY' }]]);
  });
  it('writes hours and status together for an automatic location', async () => {
    const mock = client([{ id: 'automatic-id' }]);
    expect(await writeGoogleUpdate(mock.admin as never, 'automatic-id', update, false)).toBe('written');
    expect(mock.update).toHaveBeenCalledExactlyOnceWith(update);
  });
  it('allows explicit single resynchronization to overwrite manual hours', async () => {
    const mock = client([{ id: 'manual-id' }]);
    expect(await writeGoogleUpdate(mock.admin as never, 'manual-id', update, true)).toBe('written');
    expect(mock.or).not.toHaveBeenCalled();
  });
  it('reports a failed status-only update', async () => {
    const mock = client([], true);
    expect(await writeGoogleUpdate(mock.admin as never, 'manual-id', update, false)).toBe('error');
  });
});