import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
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
const SITE_URL = 'https://kidmapp.app'

interface Props {
  userName?: string
  locationName?: string
  locationId?: string
}

const ProposalApprovedEmail = ({
  userName,
  locationName = 'ton lieu',
  locationId,
}: Props) => {
  const greeting = userName ? `Coucou ${userName} 👋` : 'Coucou 👋'
  const url = locationId ? `${SITE_URL}/location/${locationId}` : SITE_URL

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{locationName} a été ajouté à Kidmapp 🗺️</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>C'est en ligne ! 🗺️</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            <strong>{locationName}</strong> vient d'être ajouté sur {SITE_NAME}.
            Merci pour ta proposition, ça aide toutes les familles nantaises à
            découvrir de nouveaux endroits kid-friendly 💛
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0 12px' }}>
            <Button href={url} style={button}>
              Découvrir le lieu
            </Button>
          </Section>
          <Text style={footer}>{SITE_NAME} — Nantes en famille</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProposalApprovedEmail,
  subject: (data: Record<string, any>) =>
    `🗺️ ${data.locationName ?? 'Ton lieu'} est en ligne sur Kidmapp`,
  displayName: 'Proposition approuvée',
  previewData: {
    userName: 'Marie',
    locationName: 'Café des Petits',
    locationId: '00000000-0000-0000-0000-000000000000',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}
const container = {
  backgroundColor: '#FAF9F6',
  borderRadius: '24px',
  padding: '32px 28px',
  margin: '20px auto',
  maxWidth: '560px',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#D95F3B',
  margin: '0 0 16px',
  fontFamily: 'Georgia, serif',
}
const text = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#2A2A2A',
  margin: '0 0 12px',
}
const button = {
  backgroundColor: '#3B7D6E',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '18px',
  fontSize: '15px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#999',
  margin: '32px 0 0',
  textAlign: 'center' as const,
}
