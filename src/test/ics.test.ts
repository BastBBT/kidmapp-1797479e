import { describe, expect, it } from 'vitest';
import { buildIcs } from '@/lib/ics';
import type { EventItem } from '@/types/event';

const event = (note: string | null) =>
  ({ id: 'e1', name: 'Atelier', date_start: '2026-10-17', date_end: null, time: null, address: null, website: null, note }) as unknown as EventItem;

describe('buildIcs', () => {
  it("exporte la description sans marqueurs Markdown", () => {
    const ics = buildIcs(event('**Gras** et *italique*\n- item'));
    expect(ics).toContain('DESCRIPTION:Gras et italique\\n- item');
    expect(ics).not.toContain('**');
  });
});
