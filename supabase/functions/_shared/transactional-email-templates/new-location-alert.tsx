import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

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
      <Head />
      <Preview>
        {count} nouveau{count > 1 ? 'x' : ''} lieu{count > 1 ? 'x' : ''} près de chez vous
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>kidmapp</Text>
            <Text style={tagline}>Nantes pour les familles ✦</Text>
          </Section>

          <Section style={body}>
            <Text style={greeting}>Du nouveau près de chez vous !</Text>
            <Text style={sub}>
              {count} lieu{count > 1 ? 'x' : ''} adapté{count > 1 ? 's' : ''} à {names} viennent d'être ajoutés
              dans votre zone.
            </Text>

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
          </Section>

          <Section style={footer}>
            <Link href={landingUrl} style={footerLink}>
              Se désabonner des recommandations
            </Link>
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

// Styles — repris à l'identique de weekly-digest.tsx (mêmes tokens design system).
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
  display: 'block',
  padding: '0 0 12px',
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
const footer = {
  textAlign: 'center' as const,
  padding: '4px 24px 20px',
}
const footerLink = {
  fontSize: '11px',
  color: '#78716C',
  textDecoration: 'underline',
}
