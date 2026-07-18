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
const CONTACT_EMAIL = 'hello@kidmapp.app'

type SubmissionType = 'contribution' | 'location' | 'event'

interface Props {
  userName?: string
  submissionType?: SubmissionType
  submissionName?: string
  reason?: string
}

const TYPE_LABEL: Record<SubmissionType, { headline: string; noun: string; article: string }> = {
  contribution: { headline: 'Ta contribution n\'a pas été retenue', noun: 'contribution', article: 'ta' },
  location: { headline: 'Ta proposition de lieu n\'a pas été retenue', noun: 'proposition', article: 'ta' },
  event: { headline: 'Ton événement n\'a pas été retenu', noun: 'événement', article: 'ton' },
}

const SubmissionRejectedEmail = ({
  userName,
  submissionType = 'location',
  submissionName = '',
  reason = '',
}: Props) => {
  const greeting = userName ? `Coucou ${userName} 👋` : 'Coucou 👋'
  const labels = TYPE_LABEL[submissionType] ?? TYPE_LABEL.location

  return (
    <Html lang="fr" dir="ltr">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{labels.headline}</Preview>
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
            <div style={iconBubble}>
              <span style={{ fontSize: '28px', lineHeight: '64px' }}>💬</span>
            </div>
            <Text style={headline}>{labels.headline}</Text>
            {submissionName && (
              <div style={venueBadge}>
                <span style={venueBadgeText}>{submissionName}</span>
              </div>
            )}
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <Text style={greetingText}>{greeting}</Text>
            <Text style={paragraph}>
              Merci d'avoir pris le temps de partager {labels.article} {labels.noun} avec Kidmapp.
              Après relecture, on ne va pas la publier cette fois-ci.
            </Text>

            {reason && (
              <div style={reasonBox}>
                <Text style={reasonLabel}>Le mot de l'équipe Kidmapp ✦</Text>
                <Text style={reasonText}>{reason}</Text>
              </div>
            )}

            <Text style={paragraph}>
              Tu peux nous répondre directement à{' '}
              <Link href={`mailto:${CONTACT_EMAIL}`} style={inlineLink}>
                {CONTACT_EMAIL}
              </Link>{' '}
              si tu veux en discuter ou nous donner plus de contexte — on lit tout 💛
            </Text>

            <div style={{ textAlign: 'center' }}>
              <Link href={`mailto:${CONTACT_EMAIL}`} style={ctaButton}>
                Nous répondre →
              </Link>
            </div>
          </Section>

          {/* Footer */}
          <Section style={footerCell}>
            <Text style={footerBrand}>{SITE_NAME} — Nantes en famille</Text>
            <Text style={footerNote}>
              Tu reçois cet email car tu as fait une proposition sur Kidmapp.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubmissionRejectedEmail,
  subject: (data: Record<string, any>) => {
    const t = (data.submissionType as SubmissionType) ?? 'location'
    return TYPE_LABEL[t]?.headline ?? TYPE_LABEL.location.headline
  },
  displayName: 'Proposition refusée',
  previewData: {
    userName: 'Marie',
    submissionType: 'location',
    submissionName: 'Café des Petits',
    reason: 'Ce lieu n\'est malheureusement pas assez adapté aux enfants selon nos critères actuels.',
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
const iconBubble = {
  width: '64px',
  height: '64px',
  borderRadius: '32px',
  background: '#FAF0EC',
  textAlign: 'center' as const,
  margin: '0 auto 18px',
}
const headline = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontWeight: 600,
  fontSize: '26px',
  color: '#1C1917',
  lineHeight: 1.2,
  margin: '0 0 14px',
  textAlign: 'center' as const,
}
const venueBadge = {
  display: 'inline-block',
  background: '#F5F5F4',
  borderRadius: '100px',
  padding: '6px 14px',
}
const venueBadgeText = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '13px',
  fontWeight: 600,
  color: '#57534E',
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
  margin: '0 0 20px',
}
const reasonBox = {
  background: '#FAF9F6',
  border: '1px solid #E7E3DC',
  borderRadius: '14px',
  padding: '16px 18px',
  margin: '0 0 24px',
}
const reasonLabel = {
  fontFamily: "'Caveat', cursive",
  fontSize: '15px',
  color: '#D95F3B',
  margin: '0 0 6px',
  fontWeight: 600,
}
const reasonText = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '15px',
  color: '#1C1917',
  lineHeight: 1.6,
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
}
const inlineLink = {
  color: '#3B7D6E',
  textDecoration: 'underline',
  fontWeight: 600,
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
  marginTop: '8px',
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
  fontFamily: "'Caveat', cursive",
  fontSize: '13px',
  color: '#A8A29E',
  margin: 0,
}
