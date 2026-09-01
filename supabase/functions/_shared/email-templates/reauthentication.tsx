/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://kidmapp.app/icon-192.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ton code de vérification KidMapp</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="48" height="48" alt="KidMapp" style={logo} />
        <Heading style={h1}>Confirme ton identité</Heading>
        <Text style={text}>
          Utilise le code ci-dessous pour confirmer ton identité :
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expirera rapidement. Si tu n'es pas à l'origine de cette
          demande, tu peux ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#D95F3B',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
