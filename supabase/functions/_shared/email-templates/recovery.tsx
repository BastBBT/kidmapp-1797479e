/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://kidmapp.app/icon-192.png'

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Réinitialise ton mot de passe {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="48" height="48" alt={siteName} style={logo} />
        <Heading style={h1}>Réinitialiser ton mot de passe</Heading>
        <Text style={text}>
          Nous avons reçu une demande de réinitialisation de mot de passe pour
          ton compte {siteName}. Clique sur le bouton ci-dessous pour en
          choisir un nouveau.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Choisir un nouveau mot de passe
        </Button>
        <Text style={footer}>
          Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet
          email. Ton mot de passe ne sera pas modifié.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'DM Sans', Arial, sans-serif",
}
const container = { padding: '20px 25px' }
const logo = { margin: '0 0 16px', borderRadius: '12px' }
const h1 = {
  fontFamily: 'Fraunces, Georgia, serif',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#241f1b',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#6f6459',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#D95F3B',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #D95F3B',
  borderRadius: '18px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #D95F3B !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #D95F3B !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #D95F3B !important; color: #ffffff !important; }
`
