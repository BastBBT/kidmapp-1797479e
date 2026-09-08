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

interface LocationItem {
  emoji: string
  name: string
  address: string | null
  url: string
}

interface NewLocationAlertProps {
  childrenNames?: string[]
  items?: LocationItem[]
  landingUrl?: string
}

/** Même règle que weekly-digest.tsx (D8) : prénoms connus sinon repli générique. */
function greetingNames(names: string[] = []): string {
  const known = names.filter((n) => n && n.trim().length > 0)
  if (known.length === 0) return 'vos enfants'
  if (known.length === 1) return known[0]
  return `${known.slice(0, -1).join(', ')} et ${known[known.length - 1]}`
}

const NewLocationAlertEmail = ({ childrenNames = [], items = [], landingUrl = '' }: NewLocationAlertProps) => {
  const names = greetingNames(childrenNames)
  const count = items.length

  return (
    <Html lang="fr" dir="ltr">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{`${count} nouveau${count > 1 ? 'x' : ''} lieu${count > 1 ? 'x' : ''} près de chez vous`}</Preview>
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
              <span style={{ fontSize: '28px', lineHeight: '64px' }}>📍</span>
            </div>
            <Text style={headline}>Du nouveau près de chez vous !</Text>
            <div style={venueBadge}>
              <span style={venueBadgeText}>
                {count} lieu{count > 1 ? 'x' : ''} adapté{count > 1 ? 's' : ''} à {names}
              </span>
            </div>
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <Text style={paragraph}>
              {count} lieu{count > 1 ? 'x' : ''} adapté{count > 1 ? 's' : ''} à {names} viennent
              d'être ajoutés dans votre zone.
            </Text>

            <div style={listBox}>
              {items.map((item, idx) => (
                <Link key={idx} href={item.url} style={idx === 0 ? itemFirst : itemRow}>
                  <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={itemEmojiCell}>{item.emoji}</td>
                        <td>
                          <Text style={itemTitle}>{item.name}</Text>
                          {item.address ? <Text style={itemMeta}>{item.address}</Text> : null}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Link>
              ))}
            </div>
          </Section>

          {/* Footer */}
          <Section style={footerCell}>
            <Text style={footerBrand}>{SITE_NAME} — Nantes en famille</Text>
            <Text style={footerNote}>
              <Link href={landingUrl} style={footerLink}>
                Se désabonner des recommandations
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewLocationAlertEmail,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- signature imposée par TemplateEntry['subject'] (registry.ts), même patron que weekly-digest.tsx
  subject: (data: Record<string, any>) => {
    const count = (data.items ?? []).length
    return `${count} nouveau${count > 1 ? 'x' : ''} lieu${count > 1 ? 'x' : ''} près de chez vous 📍`
  },
  displayName: 'Nouveau lieu dans la zone (profil famille)',
  previewData: {
    childrenNames: ['Léa', 'Tom'],
    items: [
      { emoji: '🎨', name: 'Atelier Créatif des Chantenay', address: 'Chantenay', url: 'https://kidmapp.app/location/apercu-1' },
      { emoji: '🌳', name: 'Square des Petits Curieux', address: 'Malakoff', url: 'https://kidmapp.app/location/apercu-2' },
    ],
    landingUrl: 'https://kidmapp.app/nouveaux-lieux/apercu',
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
  background: '#EBF4F2',
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
const paragraph = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '15px',
  color: '#44403C',
  lineHeight: 1.7,
  margin: '0 0 24px',
}
const listBox = {
  borderTop: '1px solid #E7E3DC',
}
const itemFirst = {
  display: 'block',
  padding: '14px 0 12px',
  textDecoration: 'none',
}
const itemRow = {
  display: 'block',
  padding: '12px 0',
  borderTop: '1px solid #E7E3DC',
  textDecoration: 'none',
}
const itemEmojiCell = {
  width: '44px',
  height: '44px',
  borderRadius: '10px',
  backgroundColor: '#EBF4F2',
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  fontSize: '20px',
  paddingRight: '12px',
}
const itemTitle = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontWeight: 600,
  fontSize: '14px',
  color: '#1C1917',
  margin: '0 0 2px',
}
const itemMeta = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '12px',
  color: '#78716C',
  margin: '0',
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
const footerLink = {
  color: '#A8A29E',
  textDecoration: 'underline',
}
