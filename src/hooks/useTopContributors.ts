import { useMemo } from 'react';
import { useContributions } from './useLocations';
import { useAdminLocationProposals, useAdminExcludedUserIds } from './useAdminOverview';

export type TopEntry = {
  user_id: string;
  total: number;
  approved: number;
};

export type TopContributorsData = {
  proposals: TopEntry[];
  contributions: TopEntry[];
};

const aggregate = (
  rows: { user_id: string | null; status: string | null }[],
  approvedStatuses: string[],
  excludedIds: Set<string>,
): TopEntry[] => {
  const map = new Map<string, TopEntry>();
  for (const r of rows) {
    if (!r.user_id || excludedIds.has(r.user_id)) continue;
    const existing = map.get(r.user_id) ?? { user_id: r.user_id, total: 0, approved: 0 };
    existing.total += 1;
    if (r.status && approvedStatuses.includes(r.status)) existing.approved += 1;
    map.set(r.user_id, existing);
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total || b.approved - a.approved)
    .slice(0, 5);
};

/**
 * Top 5 contributeurs (location_proposals) et top 5 (contributions), comptes
 * admin et bot de sourcing exclus. Purement dérivé de données déjà chargées
 * par ailleurs (contributions, location_proposals, exclusions) — plus de
 * fetch dédié ici, donc plus de lecture redondante des mêmes tables.
 */
export function useTopContributors(enabled = true): { data?: TopContributorsData } {
  const { data: contributions = [] } = useContributions(enabled);
  const { data: proposals = [] } = useAdminLocationProposals(enabled);
  const excludedIds = useAdminExcludedUserIds(enabled);

  const data = useMemo<TopContributorsData>(
    () => ({
      proposals: aggregate(
        (proposals as any[]) as { user_id: string | null; status: string | null }[],
        ['approved'],
        excludedIds,
      ),
      contributions: aggregate(
        (contributions as any[]) as { user_id: string | null; status: string | null }[],
        ['validated'],
        excludedIds,
      ),
    }),
    [proposals, contributions, excludedIds]
  );

  return { data };
}
