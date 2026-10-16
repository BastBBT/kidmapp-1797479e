// Sélection des comptes à qui envoyer le mail de bienvenue. Fonctions pures,
// sans import Deno/npm, pour rester testables sous vitest.

/** Délai après l'inscription : le mail de confirmation arrive d'abord, et le
 * parent a eu le temps d'ouvrir l'app. */
export const WELCOME_DELAY_HOURS = 1
/** Fenêtre de rattrapage si un run horaire du cron a été manqué. Au-delà, le
 * mail n'a plus de sens : on ne « souhaite pas la bienvenue » trois jours après.
 * Borne aussi le premier run après le déploiement : seuls les comptes créés
 * dans les dernières 48 h le reçoivent, pas toute la base. */
export const WELCOME_LOOKBACK_HOURS = 48

export interface WelcomeCandidate {
  id: string
  email: string | null | undefined
  created_at: string
  email_confirmed_at: string | null | undefined
}

/**
 * Comptes éligibles : créés entre `now - LOOKBACK` et `now - DELAY`, avec un
 * email confirmé, et pas déjà accueillis (`alreadySent` = emails en minuscules
 * trouvés dans `email_send_log` pour ce template).
 */
export function welcomeRecipients(
  users: WelcomeCandidate[],
  alreadySent: Set<string>,
  now: Date,
): WelcomeCandidate[] {
  const newest = now.getTime() - WELCOME_DELAY_HOURS * 3600_000
  const oldest = now.getTime() - WELCOME_LOOKBACK_HOURS * 3600_000
  return users.filter((u) => {
    if (!u.email || !u.email_confirmed_at) return false
    const created = Date.parse(u.created_at)
    if (Number.isNaN(created) || created > newest || created < oldest) return false
    return !alreadySent.has(u.email.toLowerCase())
  })
}

/** Au-delà de ce nombre d'échecs, une adresse n'est plus retentée (sinon une
 * adresse durablement en erreur serait relancée chaque heure pendant 47 h). */
export const WELCOME_MAX_FAILURES = 3
/** Profondeur de relecture du journal : la fenêtre d'éligibilité plus un jour
 * de marge. Borne aussi la requête (PostgREST plafonne les lectures). */
export const WELCOME_LOG_LOOKBACK_HOURS = WELCOME_LOOKBACK_HOURS + 24

export interface WelcomeLogRow {
  recipient_email: string
  status: string
}

/** Emails (en minuscules) à ne plus servir : déjà accueillis (`sent` /
 * `suppressed`) ou en échec `WELCOME_MAX_FAILURES` fois. */
export function welcomeExclusions(rows: WelcomeLogRow[]): Set<string> {
  const excluded = new Set<string>()
  const failures = new Map<string, number>()
  for (const row of rows) {
    const email = row.recipient_email.toLowerCase()
    if (row.status === 'sent' || row.status === 'suppressed') {
      excluded.add(email)
    } else if (row.status === 'failed') {
      const n = (failures.get(email) ?? 0) + 1
      failures.set(email, n)
      if (n >= WELCOME_MAX_FAILURES) excluded.add(email)
    }
  }
  return excluded
}
