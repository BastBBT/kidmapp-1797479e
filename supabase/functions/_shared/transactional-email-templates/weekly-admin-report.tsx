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

interface WeeklyAdminReportProps {
  periodLabel?: string
  totalContributions?: number
  totalProposals?: number
  activeUsers?: number
  rows?: UserRow[]
}

const WeeklyAdminReportEmail = ({
  periodLabel = '',
  totalContributions = 0,
  totalProposals = 0,
  activeUsers = 0,
  rows = [],
}: WeeklyAdminReportProps) => {
  const empty = totalContributions === 0 && totalProposals === 0
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

          <Section style={statsRow}>
            <Section style={statBox}>
              <Text style={statNumber}>{totalContributions}</Text>
              <Text style={statLabel}>Contributions</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statNumber}>{totalProposals}</Text>
              <Text style={statLabel}>Propositions</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statNumber}>{activeUsers}</Text>
              <Text style={statLabel}>Utilisateurs actifs</Text>
            </Section>
          </Section>

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
const statsRow = {
  display: 'block',
  margin: '0 0 24px',
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
