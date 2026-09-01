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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://kidmapp.app/icon-192.png'

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Ton lien de connexion {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="48" height="48" alt={siteName} style={logo} />
        <Heading style={h1}>Ton lien de connexion</Heading>
        <Text style={text}>
          Clique sur le bouton ci-dessous pour te connecter à {siteName}. Ce
          lien expirera rapidement.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Me connecter
        </Button>
        <Text style={footer}>
          Si tu n'as pas demandé ce lien, tu peux ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
