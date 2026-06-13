import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Kidmapp'

interface UserRow {
  name: string
  email: string
  contributions: number
  proposals: string[]
}

interface VisitsData {
  totalA: number
  totalB: number
  deltaPct: number | null
  daily: { label: string; count: number }[]
}

interface WeeklyAdminReportProps {
  periodLabel?: string
  totalContributions?: number
  totalProposals?: number
  activeUsers?: number
  visits?: VisitsData
  rows?: UserRow[]
}

const DeltaBadge = ({ deltaPct }: { deltaPct: number | null }) => {
  if (deltaPct === null) {
    return <span style={{ ...badgeBase, backgroundColor: '#EDEAE3', color: '#6B6B6B' }}>nouveau</span>
  }
  const positive = deltaPct >= 0
  return (
    <span
      style={{
        ...badgeBase,
        backgroundColor: positive ? '#E6F4F0' : '#FBE8E2',
        color: positive ? '#3B7D6E' : '#D95F3B',
      }}
    >
      {positive ? '▲' : '▼'} {Math.abs(deltaPct)}%
    </span>
  )
}

const BarChart = ({ daily }: { daily: { label: string; count: number }[] }) => {
  const max = Math.max(1, ...daily.map((d) => d.count))
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 24px' }}
    >
      <tbody>
        <tr>
          {daily.map((d, i) => (
            <td
              key={i}
              align="center"
              valign="bottom"
              style={{ padding: '0 2px', verticalAlign: 'bottom', width: `${100 / 7}%` }}
            >
              <div style={{ fontSize: '11px', color: '#6B6B6B', margin: '0 0 4px', fontWeight: 'bold' }}>
                {d.count}
              </div>
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#EDEAE3',
                  borderRadius: '6px',
                  position: 'relative' as const,
                  overflow: 'hidden' as const,
                }}
              >
                <div
                  style={{
                    position: 'absolute' as const,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${Math.round((d.count / max) * 100)}%`,
                    backgroundColor: '#3B7D6E',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#6B6B6B', margin: '6px 0 0' }}>{d.label}</div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

const WeeklyAdminReportEmail = ({
  periodLabel = '',
  totalContributions = 0,
  totalProposals = 0,
  activeUsers = 0,
  visits = { totalA: 0, totalB: 0, deltaPct: null, daily: [] },
  rows = [],
}: WeeklyAdminReportProps) => {
  const empty = totalContributions === 0 && totalProposals === 0
  const daily =
    visits.daily.length === 7
      ? visits.daily
      : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => ({ label, count: 0 }))

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        Rapport {SITE_NAME} — semaine du {periodLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📊 Rapport hebdomadaire</Heading>
          <Text style={subtitle}>Semaine du {periodLabel}</Text>

          {/* Stats: Visites → Utilisateurs actifs → Contributions → Propositions */}
          <Section style={statBox}>
            <Text style={statLabel}>Visites (7j)</Text>
            <Text style={statNumber}>{visits.totalA}</Text>
            <Text style={statSub}>
              <DeltaBadge deltaPct={visits.deltaPct} />{' '}
              <span style={{ color: '#888', fontSize: '12px' }}>vs {visits.totalB} la semaine précédente</span>
            </Text>
          </Section>

          <Section style={statBox}>
            <Text style={statNumber}>{activeUsers}</Text>
            <Text style={statLabel}>Utilisateurs actifs</Text>
          </Section>

          <Section style={statBox}>
            <Text style={statNumber}>{totalContributions}</Text>
            <Text style={statLabel}>Contributions</Text>
          </Section>

          <Section style={statBox}>
            <Text style={statNumber}>{totalProposals}</Text>
            <Text style={statLabel}>Propositions</Text>
          </Section>

          <Heading as="h2" style={h2}>
            Visites jour par jour
          </Heading>
          <BarChart daily={daily} />

          <Heading as="h2" style={h2}>
            Détail par utilisateur
          </Heading>

          {empty ? (
            <Text style={emptyText}>Aucune activité cette semaine.</Text>
          ) : (
            <Section>
              {rows.map((row, idx) => (
                <Section key={idx} style={userCard}>
                  <Text style={userName}>{row.name}</Text>
                  {row.email ? <Text style={userEmail}>{row.email}</Text> : null}
                  <Section style={countsRow}>
                    <Text style={countText}>
                      🤝 <strong>{row.contributions}</strong> contribution
                      {row.contributions > 1 ? 's' : ''}
                    </Text>
                    <Text style={countText}>
                      📍 <strong>{row.proposals.length}</strong> proposition
                      {row.proposals.length > 1 ? 's' : ''}
                    </Text>
                  </Section>
                  {row.proposals.length > 0 ? (
                    <Section style={proposalsList}>
                      {row.proposals.map((p, i) => (
                        <Text key={i} style={proposalItem}>
                          • {p}
                        </Text>
                      ))}
                    </Section>
                  ) : null}
                </Section>
              ))}
            </Section>
          )}

          <Text style={footer}>
            {SITE_NAME} — Rapport automatique chaque lundi matin
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyAdminReportEmail,
  subject: (data: Record<string, any>) =>
    `📊 ${SITE_NAME} — Rapport semaine du ${data.periodLabel ?? ''}`,
  displayName: 'Rapport admin hebdomadaire',
  previewData: {
    periodLabel: '14/04/2026 → 20/04/2026',
    totalContributions: 12,
    totalProposals: 4,
    activeUsers: 6,
    visits: {
      totalA: 342,
      totalB: 287,
      deltaPct: 19,
      daily: [
        { label: 'Lun', count: 38 },
        { label: 'Mar', count: 52 },
        { label: 'Mer', count: 61 },
        { label: 'Jeu', count: 44 },
        { label: 'Ven', count: 49 },
        { label: 'Sam', count: 58 },
        { label: 'Dim', count: 40 },
      ],
    },
    rows: [
      {
        name: 'Marie Dupont',
        email: 'marie@example.com',
        contributions: 5,
        proposals: ['Café des Petits', 'Parc Procé'],
      },
      {
        name: 'Jean Martin',
        email: 'jean@example.com',
        contributions: 3,
        proposals: [],
      },
    ],
  },
} satisfies TemplateEntry

// Styles — Kidmapp design system
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}
const container = {
  backgroundColor: '#FAF9F6',
  borderRadius: '24px',
  padding: '32px 28px',
  margin: '20px auto',
  maxWidth: '600px',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#D95F3B',
  margin: '0 0 8px',
  fontFamily: 'Georgia, serif',
}
const subtitle = {
  fontSize: '14px',
  color: '#6B6B6B',
  margin: '0 0 28px',
}
const h2 = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#2A2A2A',
  margin: '24px 0 16px',
  fontFamily: 'Georgia, serif',
}
const statBox = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '20px 16px',
  textAlign: 'center' as const,
  margin: '0 0 12px',
  border: '1px solid #EDEAE3',
}
const statNumber = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#D95F3B',
  margin: '0 0 4px',
  lineHeight: '1',
}
const statLabel = {
  fontSize: '13px',
  color: '#6B6B6B',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const statSub = {
  fontSize: '12px',
  color: '#6B6B6B',
  margin: '8px 0 0',
}
const badgeBase = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 'bold' as const,
}
const userCard = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '16px 18px',
  margin: '0 0 12px',
  border: '1px solid #EDEAE3',
}
const userName = {
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#2A2A2A',
  margin: '0 0 2px',
}
const userEmail = {
  fontSize: '13px',
  color: '#888',
  margin: '0 0 10px',
}
const countsRow = {
  margin: '8px 0 0',
}
const countText = {
  fontSize: '13px',
  color: '#3B7D6E',
  margin: '0 0 4px',
}
const proposalsList = {
  marginTop: '8px',
  paddingLeft: '8px',
}
const proposalItem = {
  fontSize: '13px',
  color: '#555',
  margin: '0 0 2px',
}
const emptyText = {
  fontSize: '14px',
  color: '#888',
  fontStyle: 'italic' as const,
  textAlign: 'center' as const,
  padding: '20px',
}
const footer = {
  fontSize: '12px',
  color: '#999',
  margin: '32px 0 0',
  textAlign: 'center' as const,
}
