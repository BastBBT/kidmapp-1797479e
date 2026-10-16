import { describe, it, expect } from 'vitest';
import {
  welcomeRecipients,
  type WelcomeCandidate,
} from '../../supabase/functions/_shared/welcome/eligibility.ts';

const NOW = new Date('2026-10-16T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

const user = (over: Partial<WelcomeCandidate> = {}): WelcomeCandidate => ({
  id: 'u1',
  email: 'parent@example.com',
  created_at: hoursAgo(2),
  email_confirmed_at: hoursAgo(2),
  ...over,
});

const ids = (users: WelcomeCandidate[]) => users.map((u) => u.id);

describe('welcomeRecipients', () => {
  it('garde un compte confirmé créé il y a 2 h', () => {
    expect(ids(welcomeRecipients([user()], new Set(), NOW))).toEqual(['u1']);
  });

  it("attend 1 h après l'inscription", () => {
    expect(welcomeRecipients([user({ created_at: hoursAgo(0.5) })], new Set(), NOW)).toEqual([]);
  });

  it('ignore les comptes de plus de 48 h (premier run : pas toute la base)', () => {
    expect(welcomeRecipients([user({ created_at: hoursAgo(49) })], new Set(), NOW)).toEqual([]);
    expect(ids(welcomeRecipients([user({ created_at: hoursAgo(47) })], new Set(), NOW))).toEqual(['u1']);
  });

  it('ignore un email non confirmé ou absent', () => {
    expect(welcomeRecipients([user({ email_confirmed_at: null })], new Set(), NOW)).toEqual([]);
    expect(welcomeRecipients([user({ email: null })], new Set(), NOW)).toEqual([]);
  });

  it('ne renvoie pas à un compte déjà accueilli, casse comprise', () => {
    const sent = new Set(['parent@example.com']);
    expect(welcomeRecipients([user({ email: 'Parent@Example.com' })], sent, NOW)).toEqual([]);
  });

  it('ignore une date de création illisible', () => {
    expect(welcomeRecipients([user({ created_at: 'pas une date' })], new Set(), NOW)).toEqual([]);
  });
});
