// Doublons de lieux à la proposition : le tableau de cas est partagé avec Android
// (test/fixtures/duplicate_location_cases.json) et iOS (scripts/duplicate_location_cases.json) :
// mêmes saisies, mêmes lieux publiés, mêmes correspondances attendues, sur les trois plateformes.
import { describe, expect, it } from 'vitest';
import { findDuplicateLocations, type DuplicateCandidate } from '@/lib/duplicateLocation';
import table from './fixtures/duplicateLocationCases.json';

interface Case {
  label: string;
  name: string;
  address: string;
  candidates: { id: string; name: string; address: string | null }[];
  expect: { id: string; level: string }[];
}
const cases = table.cases as Case[];

describe('findDuplicateLocations : tableau partagé', () => {
  it.each(cases)('$label', (c) => {
    const candidates: DuplicateCandidate[] = c.candidates.map((x) => ({ ...x, photo: null }));
    const got = findDuplicateLocations(c.name, c.address, candidates).map((m) => `${m.candidate.id}:${m.level}`);
    expect(got).toEqual(c.expect.map((e) => `${e.id}:${e.level}`));
  });
});
