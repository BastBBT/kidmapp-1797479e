import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Kidmapp'

interface DigestItem {
  emoji: string
  name: string
  dateLabel: string
  address: string | null
}

interface WeeklyDigestProps {
  childrenNames?: string[]
  items?: DigestItem[]
  landingUrl?: string
}

/** « Léa et Tom », « Léa », ou repli générique si aucun prénom connu (D8). */
function greetingNames(names: string[] = []): string {
  const known = names.filter((n) => n && n.trim().length > 0)
  if (known.length === 0) return 'vos enfants'
  if (known.length === 1) return known[0]
  return `${known.slice(0, -1).join(', ')} et ${known[known.length - 1]}`
}

const WeeklyDigestEmail = ({ childrenNames = [], items = [], landingUrl = '' }: WeeklyDigestProps) => {
  const names = greetingNames(childrenNames)
  const count = items.length

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {count} idée{count > 1 ? 's' : ''} pour {names} cette semaine
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>kidmapp</Text>
            <Text style={tagline}>Nantes pour les familles ✦</Text>
          </Section>

          <Section style={body}>
            <Text style={greeting}>Bonjour !</Text>
            <Text style={sub}>
              Voici {count} idée{count > 1 ? 's' : ''} pour {names} cette semaine, près de chez vous.
            </Text>

            {items.map((item, idx) => (
              <Section key={idx} style={idx === 0 ? itemFirst : itemRow}>
                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={itemEmojiCell}>{item.emoji}</td>
                      <td>
                        <Text style={itemTitle}>{item.name}</Text>
                        <Text style={itemMeta}>
                          {item.dateLabel}
                          {item.address ? ` · ${item.address}` : ''}
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            ))}

            <Link href={landingUrl} style={cta}>
              Voir toute la sélection →
            </Link>

            <Section style={feedbackBox}>
              <Text style={feedbackQ}>Cette sélection vous a plu ?</Text>
              <Text style={feedbackEmojis}>
                <Link href={landingUrl} style={emojiLink}>😍</Link>
                <Link href={landingUrl} style={emojiLink}>😐</Link>
                <Link href={landingUrl} style={emojiLink}>🙁</Link>
              </Text>
            </Section>
          </Section>

          <Section style={footer}>
            <Link href={landingUrl} style={footerLink}>
              Se désabonner de la sélection hebdo
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyDigestEmail,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- signature imposée par TemplateEntry['subject'] (registry.ts), même patron que weekly-admin-report.tsx
  subject: (data: Record<string, any>) => {
    const count = (data.items ?? []).length
    const names = greetingNames(data.childrenNames ?? [])
    return `${count} idée${count > 1 ? 's' : ''} pour ${names} cette semaine 🎈`
  },
  displayName: 'Sélection hebdomadaire (profil famille)',
  previewData: {
    childrenNames: ['Léa', 'Tom'],
    items: [
      { emoji: '🎨', name: 'Atelier des Petits Curieux', dateLabel: 'Mer 9 sept · Centre Ville · 2h', address: null },
      { emoji: '🎭', name: 'Kamishibaï en plein air', dateLabel: 'Sam 12 sept · 16h', address: 'Jardin des Plantes' },
      { emoji: '🧺', name: 'Marché des créateurs', dateLabel: 'Dim 13 sept · 10h', address: 'Bellevue' },
    ],
    landingUrl: 'https://kidmapp.app/semaine/apercu',
  },
} satisfies TemplateEntry

// Styles — repris du design system Kidmapp (mêmes tokens que weekly-admin-report.tsx)
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}
const container = {
  backgroundColor: '#FAF9F6',
  borderRadius: '16px',
  overflow: 'hidden' as const,
  margin: '20px auto',
  maxWidth: '520px',
}
const header = {
  backgroundColor: '#D95F3B',
  padding: '24px',
  textAlign: 'center' as const,
}
const logo = {
  fontFamily: 'Georgia, serif',
  fontWeight: 'bold',
  color: '#ffffff',
  fontSize: '22px',
  margin: '0',
}
const tagline = {
  color: '#FAF0EC',
  fontSize: '13px',
  margin: '2px 0 0',
  fontStyle: 'italic' as const,
}
const body = {
  padding: '24px',
}
const greeting = {
  fontFamily: 'Georgia, serif',
  fontWeight: 'bold',
  fontSize: '18px',
  color: '#1C1917',
  margin: '0 0 6px',
}
const sub = {
  color: '#78716C',
  fontSize: '13px',
  margin: '0 0 20px',
  lineHeight: '1.5',
}
const itemFirst = {
  padding: '0 0 12px',
}
const itemRow = {
  padding: '12px 0',
  borderTop: '1px solid #E7E3DC',
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
  fontWeight: 'bold',
  fontSize: '13.5px',
  color: '#1C1917',
  margin: '0 0 2px',
}
const itemMeta = {
  fontSize: '12px',
  color: '#78716C',
  margin: '0',
}
const cta = {
  display: 'block',
  textAlign: 'center' as const,
  backgroundColor: '#D95F3B',
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '13.5px',
  padding: '12px',
  borderRadius: '999px',
  margin: '20px 0 4px',
}
const feedbackBox = {
  textAlign: 'center' as const,
  backgroundColor: '#FAF9F6',
  borderRadius: '12px',
  padding: '18px',
  marginTop: '8px',
}
const feedbackQ = {
  fontSize: '13px',
  color: '#1C1917',
  margin: '0 0 10px',
}
const feedbackEmojis = {
  margin: '0',
}
const emojiLink = {
  fontSize: '26px',
  textDecoration: 'none',
  margin: '0 10px',
}
const footer = {
  textAlign: 'center' as const,
  padding: '4px 24px 20px',
}
const footerLink = {
  fontSize: '11px',
  color: '#78716C',
  textDecoration: 'underline',
}
