import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Kidmapp'
const SITE_URL = 'https://kidmapp.app'
const ICON_URL = `${SITE_URL}/icon-192.png`

interface Props {
  userName?: string
  locationName?: string
  locationId?: string
  locationCategory?: string
  contributionType?: string
}

const TYPE_LABELS: Record<string, string> = {
  photo: 'ta photo',
  equipment: 'ton info équipement',
  meal: 'ton info repas',
  bookable: 'ton info réservation',
  note: 'ta note',
}

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  shop: '🛍️',
  public: '🌳',
  coiffeur: '✂️',
}

const ContributionValidatedEmail = ({
  userName,
  locationName = 'ce lieu',
  locationId,
  locationCategory,
  contributionType,
}: Props) => {
  const greeting = userName ? `Coucou ${userName} 👋` : 'Coucou 👋'
  const what =
    contributionType && TYPE_LABELS[contributionType]
      ? TYPE_LABELS[contributionType]
      : 'ta contribution'
  const url = locationId ? `${SITE_URL}/location/${locationId}` : SITE_URL
  const emoji = (locationCategory && CATEGORY_EMOJI[locationCategory]) || '📍'

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Ta contribution sur {locationName} a été validée 🎉</Preview>
      <Body style={main}>
        <Container style={card}>
          {/* Header */}
          <Section style={headerRow}>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tr>
                <td style={{ verticalAlign: 'middle' }}>
                  <Img
                    src={ICON_URL}
                    width="32"
                    height="32"
                    alt="Kidmapp"
                    style={{
                      display: 'inline-block',
                      verticalAlign: 'middle',
                      marginRight: '10px',
                      borderRadius: '9px',
                    }}
                  />
                  <span style={brandText}>kidmapp</span>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                  <span style={fromText}>noreply@kidmapp.app</span>
                </td>
              </tr>
            </table>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <div style={iconBubbleGold}>
              <span style={{ fontSize: '28px', lineHeight: '64px' }}>🎉</span>
            </div>
            <Text style={headline}>Contribution validée !</Text>
            <div style={venueBadge}>
              <span style={venueBadgeText}>
                {emoji} {locationName}
              </span>
            </div>
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <Text style={greetingText}>{greeting}</Text>
            <Text style={paragraph}>
              On vient de valider {what} sur{' '}
              <strong style={{ color: '#1C1917', fontWeight: 600 }}>{locationName}</strong>.
              Merci de rendre {SITE_NAME} plus utile pour tous les parents nantais 🙌
            </Text>

            <div style={noteBlock}>
              <Text style={noteText}>
                Chaque contribution aide les familles nantaises à mieux choisir leurs
                sorties. Tu fais partie de la communauté {SITE_NAME} 💛
              </Text>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link href={url} style={ctaButton}>
                Voir le lieu →
              </Link>
            </div>
          </Section>

          {/* Footer */}
          <Section style={footerCell}>
            <Text style={footerBrand}>{SITE_NAME} — Nantes en famille</Text>
            <Text style={footerNote}>
              Tu reçois cet email car tu as contribué à ce lieu.
            </Text>
          </Section>
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
    locationCategory: 'cafe',
    contributionType: 'photo',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  margin: 0,
  padding: '48px 16px',
  fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
}
const card = {
  background: '#ffffff',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 6px 32px rgba(0,0,0,0.09)',
  maxWidth: '560px',
  width: '100%',
  margin: '0 auto',
  border: '1px solid #E7E3DC',
}
const headerRow = {
  padding: '20px 32px',
  borderBottom: '1px solid #E7E3DC',
  background: '#ffffff',
}
const brandText = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: '18px',
  fontWeight: 600,
  color: '#1C1917',
  verticalAlign: 'middle' as const,
}
const fromText = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '11px',
  color: '#A8A29E',
  letterSpacing: '0.02em',
}
const hero = {
  padding: '44px 36px 0',
  background: '#ffffff',
  textAlign: 'center' as const,
}
const iconBubbleGold = {
  width: '64px',
  height: '64px',
  borderRadius: '32px',
  background: '#FEF9E7',
  textAlign: 'center' as const,
  margin: '0 auto 18px',
}
const headline = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontWeight: 600,
  fontSize: '30px',
  color: '#D95F3B',
  lineHeight: 1.15,
  margin: '0 0 14px',
  textAlign: 'center' as const,
}
const venueBadge = {
  display: 'inline-block',
  background: '#EBF4F2',
  borderRadius: '100px',
  padding: '6px 14px',
}
const venueBadgeText = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '13px',
  fontWeight: 600,
  color: '#3B7D6E',
  whiteSpace: 'nowrap' as const,
}
const bodySection = { padding: '32px 40px 36px', background: '#ffffff' }
const greetingText = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '15px',
  color: '#1C1917',
  margin: '0 0 16px',
  fontWeight: 500,
}
const paragraph = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '15px',
  color: '#44403C',
  lineHeight: 1.7,
  margin: '0 0 28px',
}
const noteBlock = {
  background: '#FEF9E7',
  borderRadius: '10px',
  borderLeft: '4px solid #F2C94C',
  padding: '14px 18px',
  margin: '0 0 32px',
}
const noteText = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontWeight: 400,
  fontSize: '14px',
  color: '#78716C',
  margin: 0,
  lineHeight: 1.6,
}
const ctaButton = {
  display: 'inline-block',
  background: '#3B7D6E',
  color: '#ffffff',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontWeight: 600,
  fontSize: '15px',
  textDecoration: 'none',
  padding: '15px 36px',
  borderRadius: '100px',
  letterSpacing: '0.01em',
}
const footerCell = {
  padding: '20px 40px 28px',
  borderTop: '1px solid #E7E3DC',
  background: '#FAF9F6',
  textAlign: 'center' as const,
}
const footerBrand = {
  fontFamily: "'Caveat', cursive",
  fontSize: '17px',
  color: '#78716C',
  margin: '0 0 4px',
  lineHeight: 1.4,
}
const footerNote = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '11px',
  color: '#A8A29E',
  margin: 0,
}
