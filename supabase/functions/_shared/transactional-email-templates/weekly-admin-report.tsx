import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { stackHeights } from '../weekly-report/stats.ts'

const SITE_NAME = 'Kidmapp'

interface Compare {
  cur: number
  prev: number
}

interface PlatformRow {
  key: string
  label: string
  color: string
  count: number
  prev: number
}

interface DailyRow {
  label: string
  web: number
  ios: number
  android: number
}

interface TopEvent {
  name: string
  sub: string
  views: number
  deltaPct: number | null
}

interface Sorties {
  views: number
  viewsPrev: number
  deltaPct: number | null
  visitors: number
  returningPct: number | null
  clicks: number
  top: TopEvent[]
}

interface WeeklyAdminReportProps {
  periodLabel?: string
  prevPeriodLabel?: string
  sorties?: Sorties
  tiles?: {
    sessions: Compare
    signups: Compare
    contributions: Compare
    proposals: Compare
  }
  platforms?: PlatformRow[]
  daily?: DailyRow[]
}

const GREEN = '#3B7D6E'
const ORANGE = '#D95F3B'
const GREY = '#EDEAE3'
const BAR_GREY = '#E7E3DC'
const MUTED = '#6B6B6B'
const NUMBER_FONT = 'Georgia, serif'

const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0')

type Tone = 'up' | 'down' | 'flat' | 'new'

const toneStyle: Record<Tone, { bg: string; color: string }> = {
  up: { bg: '#E6F4F0', color: GREEN },
  down: { bg: '#FBE8E2', color: ORANGE },
  flat: { bg: GREY, color: MUTED },
  new: { bg: '#FEF9E7', color: '#946E00' },
}

const Badge = ({ tone, children, size = 11 }: { tone: Tone; children: React.ReactNode; size?: number }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: '999px',
      fontSize: `${size}px`,
      fontWeight: 'bold' as const,
      backgroundColor: toneStyle[tone].bg,
      color: toneStyle[tone].color,
      whiteSpace: 'nowrap' as const,
    }}
  >
    {children}
  </span>
)

/** Écart en pourcentage ; « nouveau » quand il n'y avait rien la semaine d'avant. */
const PctBadge = ({ pct, size }: { pct: number | null; size?: number }) => {
  if (pct === null) return <Badge tone="new" size={size}>nouveau</Badge>
  if (pct === 0) return <Badge tone="flat" size={size}>= 0%</Badge>
  return (
    <Badge tone={pct > 0 ? 'up' : 'down'} size={size}>
      {pct > 0 ? '▲' : '▼'} {Math.abs(pct)}%
    </Badge>
  )
}

/** Écart en valeur absolue, pour les petits comptes où un pourcentage n'aurait pas de sens. */
const DiffBadge = ({ cur, prev }: Compare) => {
  const diff = cur - prev
  if (diff === 0) return <Badge tone="flat">= 0</Badge>
  return (
    <Badge tone={diff > 0 ? 'up' : 'down'}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
    </Badge>
  )
}

const pctOf = (cur: number, prev: number): number | null =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 100)

// Tout est en tableaux et en hauteurs/largeurs fixes : `position: absolute`, `overflow: hidden`,
// flex et les hauteurs en % ne sont pas fiables dans les clients mail (Gmail, Outlook).

const Tile = ({ value, label, badge }: { value: number; label: string; badge: React.ReactNode }) => (
  <td
    align="center"
    valign="top"
    style={{
      width: '25%',
      backgroundColor: '#ffffff',
      border: `1px solid ${GREY}`,
      borderRadius: '14px',
      padding: '12px 2px 10px',
      textAlign: 'center' as const,
    }}
  >
    <div style={{ fontFamily: NUMBER_FONT, fontSize: '24px', fontWeight: 'bold', lineHeight: '1', color: '#2A2A2A' }}>
      {fmt(value)}
    </div>
    <div
      style={{
        fontSize: '9.5px',
        letterSpacing: '0.4px',
        textTransform: 'uppercase' as const,
        color: MUTED,
        margin: '5px 0 6px',
      }}
    >
      {label}
    </div>
    {badge}
  </td>
)

const Gap = () => <td style={{ width: '6px', padding: 0, fontSize: '1px' }}>&nbsp;</td>

/** Une barre horizontale : `pct` % de la largeur disponible, 7 px de haut. */
const HBar = ({ pct, color }: { pct: number; color: string }) => {
  const w = pct <= 0 ? 0 : Math.max(1, Math.min(100, Math.round(pct)))
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ width: '100%', borderCollapse: 'separate' }}>
      <tbody>
        <tr>
          {w > 0 ? (
            <td
              width={`${w}%`}
              style={{
                width: `${w}%`,
                height: '7px',
                lineHeight: '7px',
                fontSize: '1px',
                backgroundColor: color,
                borderRadius: '4px',
              }}
            >
              &nbsp;
            </td>
          ) : null}
          {w < 100 ? <td style={{ fontSize: '1px', lineHeight: '7px', height: '7px' }}>&nbsp;</td> : null}
        </tr>
      </tbody>
    </table>
  )
}

const BAR_AREA_PX = 70

const DailyChart = ({ daily, platforms }: { daily: DailyRow[]; platforms: PlatformRow[] }) => {
  const totals = daily.map((d) => d.web + d.ios + d.android)
  const max = Math.max(1, ...totals)
  const colors = Object.fromEntries(platforms.map((p) => [p.key, p.color]))
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ width: '100%', borderCollapse: 'separate' }}>
      <tbody>
        <tr>
          {daily.map((d, i) => {
            // De haut en bas : vide, android, ios, web.
            const order: ('android' | 'ios' | 'web')[] = ['android', 'ios', 'web']
            const { empty, segs } = stackHeights(order.map((k) => d[k]), max, BAR_AREA_PX)
            const cells = order
              .map((k, j) => ({ k, h: segs[j] }))
              .filter((c) => c.h > 0)
            const rows: { key: string; h: number; color: string }[] = []
            if (empty > 0) rows.push({ key: 'empty', h: empty, color: GREY })
            for (const c of cells) rows.push({ key: c.k, h: c.h, color: colors[c.k] ?? GREEN })
            return (
              <td key={i} align="center" valign="bottom" style={{ width: `${100 / 7}%`, padding: '0 2px', verticalAlign: 'bottom' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: MUTED, margin: '0 0 3px' }}>{fmt(totals[i])}</div>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ width: '100%', borderCollapse: 'separate' }}>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.key}>
                        <td
                          height={r.h}
                          style={{
                            height: `${r.h}px`,
                            lineHeight: `${r.h}px`,
                            fontSize: '1px',
                            backgroundColor: r.color,
                            borderRadius:
                              rows.length === 1
                                ? '5px'
                                : idx === 0
                                  ? '5px 5px 0 0'
                                  : idx === rows.length - 1
                                    ? '0 0 5px 5px'
                                    : '0',
                          }}
                        >
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: '10px', color: MUTED, margin: '5px 0 0' }}>{d.label}</div>
              </td>
            )
          })}
        </tr>
      </tbody>
    </table>
  )
}

const Dot = ({ color }: { color: string }) => (
  <span
    style={{
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '4px',
      backgroundColor: color,
      margin: '0 5px 0 0',
    }}
  />
)

const emptySorties: Sorties = { views: 0, viewsPrev: 0, deltaPct: null, visitors: 0, returningPct: null, clicks: 0, top: [] }
const zero: Compare = { cur: 0, prev: 0 }
const emptyDaily: DailyRow[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => ({
  label,
  web: 0,
  ios: 0,
  android: 0,
}))

const WeeklyAdminReportEmail = ({
  periodLabel = '',
  prevPeriodLabel = '',
  sorties = emptySorties,
  tiles = { sessions: zero, signups: zero, contributions: zero, proposals: zero },
  platforms = [],
  daily = emptyDaily,
}: WeeklyAdminReportProps) => {
  const dailyRows = daily.length === 7 ? daily : emptyDaily
  const platformMax = Math.max(1, ...platforms.flatMap((p) => [p.count, p.prev]))

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {fmt(sorties.views)} fiches de sorties ouvertes, {fmt(tiles.sessions.cur)} sessions — semaine du {periodLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📊 Rapport hebdo</Heading>
          <Text style={subtitle}>
            Semaine du {periodLabel}
            {prevPeriodLabel ? ` · comparée à la semaine du ${prevPeriodLabel}` : ''}
          </Text>

          {/* Bandeau sorties : le chiffre qui doit monter d'une semaine à l'autre */}
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            width="100%"
            style={{
              width: '100%',
              backgroundColor: '#FAF0EC',
              border: '1px solid #F0C4B4',
              borderRadius: '16px',
              margin: '0 0 10px',
              borderCollapse: 'separate',
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '14px 14px 4px' }}>
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 'bold',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase' as const,
                      color: ORANGE,
                      margin: '0 0 6px',
                    }}
                  >
                    Sorties — fiches ouvertes
                  </div>
                  <span style={{ fontFamily: NUMBER_FONT, fontSize: '38px', fontWeight: 'bold', lineHeight: '1', color: '#2A2A2A' }}>
                    {fmt(sorties.views)}
                  </span>{' '}
                  <PctBadge pct={sorties.deltaPct} size={12} />
                  <div style={{ fontSize: '11px', color: MUTED, margin: '4px 0 0' }}>
                    vs {fmt(sorties.viewsPrev)} la semaine du {prevPeriodLabel}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0 14px 12px' }}>
                  <table
                    role="presentation"
                    cellPadding={0}
                    cellSpacing={0}
                    width="100%"
                    style={{ width: '100%', borderTop: '1px solid #F0C4B4', marginTop: '10px', tableLayout: 'fixed' as const }}
                  >
                    <tbody>
                      <tr>
                        {[
                          { v: fmt(sorties.visitors), l: 'visiteurs distincts' },
                          {
                            v: sorties.returningPct === null ? '—' : `${sorties.returningPct} %`,
                            l: "déjà venus la semaine d'avant",
                          },
                          { v: fmt(sorties.clicks), l: 'clics vers le site / la résa' },
                        ].map((s, i) => (
                          <td key={i} valign="top" style={{ padding: '9px 6px 0 0' }}>
                            <div style={{ fontFamily: NUMBER_FONT, fontSize: '17px', fontWeight: 'bold', color: '#2A2A2A' }}>{s.v}</div>
                            <div style={{ fontSize: '10.5px', color: MUTED, lineHeight: '1.3', margin: '2px 0 0' }}>{s.l}</div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Quatre repères sur une ligne */}
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            width="100%"
            style={{ width: '100%', tableLayout: 'fixed' as const, borderCollapse: 'separate' }}
          >
            <tbody>
              <tr>
                <Tile
                  value={tiles.sessions.cur}
                  label="Sessions"
                  badge={<PctBadge pct={pctOf(tiles.sessions.cur, tiles.sessions.prev)} />}
                />
                <Gap />
                <Tile value={tiles.signups.cur} label="Inscrits" badge={<DiffBadge {...tiles.signups} />} />
                <Gap />
                <Tile value={tiles.contributions.cur} label="Contrib." badge={<DiffBadge {...tiles.contributions} />} />
                <Gap />
                <Tile value={tiles.proposals.cur} label="Propos." badge={<DiffBadge {...tiles.proposals} />} />
              </tr>
            </tbody>
          </table>

          <Heading as="h2" style={h2}>
            Sessions par appareil
          </Heading>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={card}>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px' }}>
                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ width: '100%' }}>
                    <tbody>
                      {platforms.map((p) => (
                        <tr key={p.key}>
                          <td style={{ width: '66px', padding: '5px 0', fontSize: '12px', fontWeight: 'bold', color: '#2A2A2A', whiteSpace: 'nowrap' as const }}>
                            <Dot color={p.color} />
                            {p.label}
                          </td>
                          <td style={{ padding: '5px 8px 5px 0' }}>
                            <HBar pct={(p.prev / platformMax) * 100} color={BAR_GREY} />
                            <div style={{ height: '2px', lineHeight: '2px', fontSize: '1px' }}>&nbsp;</div>
                            <HBar pct={(p.count / platformMax) * 100} color={p.color} />
                          </td>
                          <td align="right" style={{ width: '96px', padding: '5px 0', fontSize: '12px', whiteSpace: 'nowrap' as const }}>
                            <span style={{ fontFamily: NUMBER_FONT, fontSize: '15px', fontWeight: 'bold', color: '#2A2A2A' }}>
                              {fmt(p.count)}
                            </span>{' '}
                            <PctBadge pct={pctOf(p.count, p.prev)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={legend}>Barre grise = semaine précédente, barre colorée = cette semaine.</div>
                </td>
              </tr>
            </tbody>
          </table>

          <Heading as="h2" style={h2}>
            Sessions jour par jour
          </Heading>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={card}>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px' }}>
                  <DailyChart daily={dailyRows} platforms={platforms} />
                  <div style={legend}>
                    {platforms.map((p) => (
                      <span key={p.key}>
                        <Dot color={p.color} />
                        {p.label}
                        {'\u00a0\u00a0'}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <Heading as="h2" style={h2}>
            Sorties les plus visitées
          </Heading>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={card}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 14px 12px' }}>
                  {sorties.top.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' as const, padding: '10px 0' }}>
                      Aucune fiche de sortie ouverte cette semaine.
                    </div>
                  ) : (
                    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ width: '100%' }}>
                      <tbody>
                        {sorties.top.map((t, i) => (
                          <tr key={i}>
                            <td
                              valign="middle"
                              style={{ width: '20px', padding: '7px 0', borderTop: i === 0 ? 'none' : `1px solid ${GREY}`, fontSize: '12.5px', fontWeight: 'bold', color: MUTED }}
                            >
                              {i + 1}
                            </td>
                            <td
                              valign="middle"
                              style={{ padding: '7px 6px 7px 0', borderTop: i === 0 ? 'none' : `1px solid ${GREY}`, fontSize: '12.5px', color: '#2A2A2A' }}
                            >
                              {t.name}
                              {t.sub ? <div style={{ fontSize: '10.5px', color: MUTED, margin: '1px 0 0' }}>{t.sub}</div> : null}
                            </td>
                            <td
                              align="right"
                              valign="middle"
                              style={{ width: '96px', padding: '7px 0', borderTop: i === 0 ? 'none' : `1px solid ${GREY}`, fontSize: '12.5px', fontWeight: 'bold', whiteSpace: 'nowrap' as const }}
                            >
                              {fmt(t.views)} <PctBadge pct={t.deltaPct} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div style={legend}>Fiches ouvertes dans la semaine (web et apps), admins exclus.</div>
                </td>
              </tr>
            </tbody>
          </table>

          <Text style={footer}>{SITE_NAME} — Rapport automatique chaque lundi matin</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyAdminReportEmail,
  subject: (data: Record<string, any>) =>
    `📊 ${SITE_NAME} — Rapport semaine du ${data.periodLabel ?? ''}`,
  displayName: 'Rapport admin hebdomadaire',
  previewData: {
    periodLabel: '26/10/2026 → 01/11/2026',
    prevPeriodLabel: '19/10',
    sorties: {
      views: 412,
      viewsPrev: 349,
      deltaPct: 18,
      visitors: 187,
      returningPct: 38,
      clicks: 64,
      top: [
        { name: 'Marché de Noël des petits', sub: 'Sam 14/11', views: 182, deltaPct: 40 },
        { name: 'Ciné-goûter, Katorza', sub: 'Mer 04/11', views: 96, deltaPct: 8 },
        { name: 'Atelier cuisine parents-enfants', sub: 'Chaque samedi', views: 74, deltaPct: 0 },
        { name: 'Spectacle « Les Petits Pas »', sub: 'Dim 08/11', views: 61, deltaPct: -22 },
        { name: 'Balade contée au Parc de Procé', sub: 'Mer 04/11', views: 48, deltaPct: null },
      ],
    },
    tiles: {
      sessions: { cur: 1284, prev: 1145 },
      signups: { cur: 23, prev: 18 },
      contributions: { cur: 14, prev: 17 },
      proposals: { cur: 3, prev: 3 },
    },
    platforms: [
      { key: 'web', label: 'Web', color: '#E8A838', count: 760, prev: 690 },
      { key: 'ios', label: 'iOS', color: '#D95F3B', count: 340, prev: 255 },
      { key: 'android', label: 'Android', color: '#3B7D6E', count: 184, prev: 190 },
    ],
    daily: [
      { label: 'Lun', web: 90, ios: 30, android: 20 },
      { label: 'Mar', web: 100, ios: 45, android: 25 },
      { label: 'Mer', web: 120, ios: 50, android: 28 },
      { label: 'Jeu', web: 115, ios: 60, android: 30 },
      { label: 'Ven', web: 110, ios: 55, android: 25 },
      { label: 'Sam', web: 130, ios: 55, android: 30 },
      { label: 'Dim', web: 95, ios: 45, android: 26 },
    ],
  },
} satisfies TemplateEntry

// Styles — Kidmapp design system
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}
const container = {
  backgroundColor: '#FAF9F6',
  borderRadius: '24px',
  padding: '24px 16px',
  margin: '20px auto',
  maxWidth: '600px',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 'bold',
  color: ORANGE,
  margin: '0 0 4px',
  fontFamily: 'Georgia, serif',
}
const subtitle = {
  fontSize: '13px',
  color: MUTED,
  margin: '0 0 16px',
}
const h2 = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#2A2A2A',
  margin: '22px 0 10px',
  fontFamily: 'Georgia, serif',
}
const card = {
  width: '100%',
  backgroundColor: '#ffffff',
  border: `1px solid ${GREY}`,
  borderRadius: '14px',
  borderCollapse: 'separate' as const,
}
const legend = {
  fontSize: '10.5px',
  color: MUTED,
  margin: '8px 0 0',
}
const footer = {
  fontSize: '11px',
  color: '#999',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}
