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

// Mail de bienvenue (une fois, ~1 h après l'inscription — cf. welcome-email).
// Mail de service : il explique comment régler le compte, sans promotion
// (Lovable Emails n'accepte que du transactionnel). Maquette validée :
// Kidmapp/emails/bienvenue.html.

const SITE_NAME = 'Kidmapp'
const SITE_URL = 'https://kidmapp.app'
const LOGO_URL = `${SITE_URL}/icon-512.png`
const ACCOUNT_URL = `${SITE_URL}/account`
const PROPOSE_URL = `${SITE_URL}/propose`
const INSTAGRAM_URL = 'https://www.instagram.com/kidmapp/'

const STEPS = [
  {
    n: '1',
    color: '#3B7D6E',
    title: '👶 Ajoute tes enfants',
    text: "Juste leur mois et année de naissance. L'app filtre ensuite les lieux et sorties adaptés à leur âge, et suit leur âge au fil du temps.",
  },
  {
    n: '2',
    color: '#3B7D6E',
    title: '📍 Choisis ta zone',
    text: 'Ta commune ou ton quartier, et la distance que tu acceptes de faire (de 5 à 50 km).',
  },
  {
    n: '3',
    color: '#D95F3B',
    title: '📬 Active ta sélection de la semaine',
    text: 'Par email ou par notification, le jour que tu choisis : les sorties des 7 prochains jours pour tes enfants, près de chez toi. Et on te prévient quand un nouveau lieu ouvre dans ta zone.',
  },
]

const WelcomeEmail = () => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>3 réglages de 2 minutes pour recevoir les bonnes sorties pour tes enfants.</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={headerRow}>
          <span style={brandText}>kidmapp</span>
        </Section>

        <Section style={hero}>
          <Img src={LOGO_URL} width="88" height="88" alt={SITE_NAME} style={logo} />
          <Text style={headline}>Bienvenue sur Kidmapp&nbsp;!</Text>
          <div style={badge}>
            <span style={badgeText}>Les sorties en famille autour de Nantes</span>
          </div>
        </Section>

        <Section style={bodySection}>
          <Text style={paragraph}>Bonjour,</Text>
          <Text style={paragraph}>
            Merci d'avoir créé ton compte. Kidmapp rassemble les lieux et les sorties pensés pour
            les enfants, à Nantes et autour.
          </Text>
          <Text style={paragraph}>
            Pour que l'app te propose <strong style={strong}>les bonnes idées au bon moment</strong>,
            trois petits réglages suffisent :
          </Text>

          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: '8px' }}>
            <tbody>
              {STEPS.map((step, idx) => (
                <tr key={step.n}>
                  <td width="56" valign="top" style={idx === 0 ? stepCellFirst : stepCell}>
                    <div style={{ ...stepNumber, background: step.color }}>{step.n}</div>
                  </td>
                  <td valign="top" style={idx === 0 ? stepCellFirst : stepCell}>
                    <div style={stepTitle}>{step.title}</div>
                    <div style={stepText}>{step.text}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href={ACCOUNT_URL} style={ctaButton}>
              Je règle mon profil →
            </Link>
          </div>
          <Text style={ctaHint}>
            Dans l'app : onglet <strong style={hintStrong}>Mon compte</strong> →{' '}
            <strong style={hintStrong}>Ma famille</strong>.
          </Text>

          <div style={tipsBox}>
            <Text style={tipsTitle}>Deux astuces en plus</Text>
            <Text style={tipsText}>
              ❤️ Sauvegarde tes lieux préférés pour les retrouver en un geste.
              <br />➕ Tu connais un lieu ou une sortie qu'on n'a pas&nbsp;?{' '}
              <Link href={PROPOSE_URL} style={inlineLink}>
                Propose-le
              </Link>
              , on vérifie et on l'ajoute.
            </Text>
          </div>

          <Text style={signOff}>
            Bonnes sorties&nbsp;!
            <br />
            <span style={signature}>Julie et Bastien, Kidmapp</span>
          </Text>

          <div style={instaBox}>
            <Text style={instaText}>📸 Nos idées de sorties du moment, c'est aussi sur Instagram&nbsp;!</Text>
            <Link href={INSTAGRAM_URL} style={instaLink}>
              Suivre @kidmapp →
            </Link>
          </div>
        </Section>

        <Section style={footerCell}>
          <Text style={footerBrand}>{SITE_NAME} · Nantes en famille</Text>
          <Text style={footerNote}>
            Tu reçois ce mail une seule fois, suite à la création de ton compte Kidmapp.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bienvenue sur Kidmapp ! 3 réglages pour bien commencer',
  displayName: 'Bienvenue (après inscription)',
  previewData: {},
} satisfies TemplateEntry

const sans = "'DM Sans', system-ui, -apple-system, sans-serif"
const serif = "'Fraunces', Georgia, serif"

const main = { backgroundColor: '#ffffff', fontFamily: sans }
const card = {
  maxWidth: '600px',
  margin: '0 auto',
  background: '#ffffff',
  border: '1px solid #E7E3DC',
  borderRadius: '16px',
  overflow: 'hidden' as const,
}
const headerRow = { padding: '18px 32px', borderBottom: '1px solid #E7E3DC' }
const brandText = { fontFamily: serif, fontSize: '18px', fontWeight: 600, color: '#1C1917' }
const hero = { padding: '40px 40px 32px', background: '#FAF0EC', textAlign: 'center' as const }
const logo = { display: 'block', margin: '0 auto 18px', borderRadius: '22px', border: 0 }
const headline = {
  fontFamily: serif,
  fontWeight: 600,
  fontSize: '30px',
  lineHeight: 1.2,
  color: '#D95F3B',
  margin: '0 0 14px',
}
const badge = {
  display: 'inline-block',
  background: '#EBF4F2',
  borderRadius: '100px',
  padding: '7px 16px',
}
const badgeText = { fontFamily: sans, fontSize: '13px', fontWeight: 600, color: '#3B7D6E' }
const bodySection = { padding: '32px 40px 36px' }
const paragraph = { fontFamily: sans, fontSize: '15px', lineHeight: 1.6, color: '#44403C', margin: '0 0 14px' }
const strong = { color: '#1C1917' }
const stepCellFirst = { padding: '14px 0' }
const stepCell = { padding: '14px 0', borderTop: '1px solid #E7E3DC' }
const stepNumber = {
  width: '36px',
  height: '36px',
  lineHeight: '36px',
  borderRadius: '18px',
  textAlign: 'center' as const,
  fontFamily: serif,
  fontSize: '17px',
  fontWeight: 600,
  color: '#ffffff',
}
const stepTitle = { fontFamily: sans, fontSize: '15px', fontWeight: 600, color: '#1C1917', margin: '0 0 3px' }
const stepText = { fontFamily: sans, fontSize: '14px', lineHeight: 1.5, color: '#78716C' }
const ctaButton = {
  display: 'inline-block',
  background: '#3B7D6E',
  color: '#ffffff',
  fontFamily: sans,
  fontWeight: 600,
  fontSize: '15px',
  textDecoration: 'none',
  padding: '15px 36px',
  borderRadius: '100px',
}
const ctaHint = {
  fontFamily: sans,
  fontSize: '13px',
  lineHeight: 1.5,
  color: '#78716C',
  textAlign: 'center' as const,
  margin: '12px 0 0',
}
const hintStrong = { color: '#44403C' }
const tipsBox = { background: '#FAF9F6', borderRadius: '12px', padding: '18px 20px', marginTop: '28px' }
const tipsTitle = { fontFamily: sans, fontSize: '14px', fontWeight: 600, color: '#1C1917', margin: '0 0 6px' }
const tipsText = { fontFamily: sans, fontSize: '14px', lineHeight: 1.6, color: '#44403C', margin: 0 }
const inlineLink = { color: '#3B7D6E', fontWeight: 600, textDecoration: 'underline' }
const signOff = { fontFamily: sans, fontSize: '15px', lineHeight: 1.6, color: '#44403C', margin: '24px 0 0' }
const signature = { fontFamily: serif, fontWeight: 600, color: '#1C1917' }
const instaBox = {
  background: '#FAF0EC',
  borderRadius: '12px',
  padding: '18px 20px',
  marginTop: '24px',
  textAlign: 'center' as const,
}
const instaText = { fontFamily: sans, fontSize: '14px', lineHeight: 1.55, color: '#44403C', margin: '0 0 8px' }
const instaLink = { fontFamily: sans, fontSize: '14px', fontWeight: 600, color: '#D95F3B', textDecoration: 'none' }
const footerCell = {
  padding: '20px 40px 24px',
  borderTop: '1px solid #E7E3DC',
  background: '#FAF9F6',
  textAlign: 'center' as const,
}
const footerBrand = { fontFamily: serif, fontSize: '14px', fontWeight: 600, color: '#1C1917', margin: '0 0 6px' }
const footerNote = { fontFamily: sans, fontSize: '12px', lineHeight: 1.5, color: '#78716C', margin: 0 }
