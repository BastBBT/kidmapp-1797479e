import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Alerte aux admins envoyée par `sync-opening-hours` quand Google passe un lieu publié en
// « fermé définitivement ». Le lieu n'est jamais désactivé automatiquement : on le fait à la main.

interface ClosedLocation {
  name: string
  city: string | null
}

const LocationClosedAlertEmail = ({ locations = [] }: { locations?: ClosedLocation[] }) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {locations.length > 1 ? `${locations.length} lieux fermés définitivement` : 'Un lieu fermé définitivement'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Lieux fermés définitivement selon Google</Heading>
        <Section style={card}>
          {locations.map((l, i) => (
            <Text key={i} style={item}>
              {l.name}
              {l.city ? ` — ${l.city}` : ''}
            </Text>
          ))}
        </Section>
        <Text style={body}>
          Ils sont toujours publiés dans l'app, avec le bandeau « Fermé définitivement » sur leur fiche.
          Vérifie, puis désactive-les depuis l'admin si c'est bien le cas.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LocationClosedAlertEmail,
  subject: (data: { locations?: ClosedLocation[] }) => {
    const n = data.locations?.length ?? 0
    return n > 1 ? `Kidmapp — ${n} lieux fermés définitivement` : 'Kidmapp — un lieu fermé définitivement'
  },
  displayName: 'Alerte lieu fermé définitivement',
  previewData: { locations: [{ name: 'La Cantine du Voyage', city: 'Nantes' }] },
} satisfies TemplateEntry

const main = { backgroundColor: '#FAF7F2', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#2A2A2A', margin: '0 0 20px' }
const card = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '12px 18px',
  margin: '0 0 16px',
  border: '1px solid #EDEAE3',
}
const item = { fontSize: '15px', fontWeight: 'bold', color: '#D95F3B', margin: '4px 0' }
const body = { fontSize: '14px', color: '#2A2A2A', lineHeight: '20px', margin: '0 0 8px' }
