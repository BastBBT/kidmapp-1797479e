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
  contributionType?: string
}

const TYPE_LABELS: Record<string, string> = {
  photo: 'ta photo',
  equipment: 'ton info équipement',
  meal: 'ton info repas',
  bookable: 'ton info réservation',
  note: 'ta note',
}

const ContributionValidatedEmail = ({
  userName,
  locationName = 'ce lieu',
  locationId,
  contributionType,
}: Props) => {
  const greeting = userName ? `Coucou ${userName} 👋` : 'Coucou 👋'
  const what = contributionType && TYPE_LABELS[contributionType]
    ? TYPE_LABELS[contributionType]
    : 'ta contribution'
  const url = locationId ? `${SITE_URL}/location/${locationId}` : SITE_URL

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Ta contribution sur {locationName} a été validée 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Validée ! 🎉</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            On vient de valider {what} sur <strong>{locationName}</strong>. Merci
            de rendre {SITE_NAME} plus utile pour tous les parents nantais 🙌
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0 12px' }}>
            <Button href={url} style={button}>
              Voir le lieu
            </Button>
          </Section>
          <Text style={footer}>{SITE_NAME} — Nantes en famille</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContributionValidatedEmail,
  subject: (data: Record<string, any>) =>
    `🎉 Ta contribution sur ${data.locationName ?? 'Kidmapp'} a été validée`,
  displayName: 'Contribution validée',
  previewData: {
    userName: 'Marie',
    locationName: 'Café des Petits',
    locationId: '00000000-0000-0000-0000-000000000000',
    contributionType: 'photo',
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
