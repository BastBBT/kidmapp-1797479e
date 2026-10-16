import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Alerte interne (destinataire fixe : Bastien) envoyée par `sourcing-watchdog` quand une routine de
// collecte d'events n'a pas tourné, a planté ou n'a rien inséré.

interface Alert {
  label: string
  scheduledAt: string
  problem: 'missing' | 'error' | 'partial' | 'empty'
  detail: string | null
}

const PROBLEM_TEXT: Record<Alert['problem'], string> = {
  missing: "n'a pas écrit son compte-rendu : le run n'a pas tourné, ou s'est arrêté avant la fin.",
  error: "s'est terminée en erreur.",
  partial: "s'est terminée partiellement : une partie des events n'a pas été insérée.",
  empty: "a tourné mais n'a inséré aucun event, ce qui n'arrive jamais un lundi normal.",
}

const formatParis = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

const SourcingAlertEmail = ({ alerts = [] }: { alerts?: Alert[] }) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Collecte des sorties : {alerts.length > 1 ? `${alerts.length} problèmes` : 'un run à relancer'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Collecte des sorties</Heading>
        {alerts.map((a, i) => (
          <Section key={i} style={card}>
            <Text style={title}>{a.label}</Text>
            <Text style={body}>
              Prévue {formatParis(a.scheduledAt)}, elle {PROBLEM_TEXT[a.problem]}
            </Text>
            {a.detail && <Text style={detail}>{a.detail}</Text>}
          </Section>
        ))}
        <Text style={body}>
          Relance-la depuis claude.ai/code/routines (« Run now »). Si c'est la collecte du 1er lundi du mois,
          précise « fais le run mensuel ».
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SourcingAlertEmail,
  subject: (data: { alerts?: Alert[] }) =>
    `⚠️ Kidmapp — collecte des sorties à relancer${(data.alerts?.length ?? 0) > 1 ? ` (${data.alerts?.length})` : ''}`,
  to: 'bastien.boubat@gmail.com',
  displayName: 'Alerte collecte des sorties',
  previewData: {
    alerts: [
      {
        label: 'Collecte du lundi (kidmapp-weekly-events)',
        scheduledAt: '2026-10-19T07:00:00.000Z',
        problem: 'missing',
        detail: null,
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#FAF7F2', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#2A2A2A', margin: '0 0 20px' }
const card = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '16px 18px',
  margin: '0 0 12px',
  border: '1px solid #EDEAE3',
}
const title = { fontSize: '15px', fontWeight: 'bold', color: '#D95F3B', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#2A2A2A', lineHeight: '20px', margin: '0 0 8px' }
const detail = { fontSize: '13px', color: '#6B6B6B', fontFamily: 'Menlo, monospace', margin: '4px 0 0' }
