import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<SuppressionReason, string> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<SuppressionReason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

// Records a terminal delivery outcome in the project's own history tables.
// Notification-only: Lovable enforces suppression at send time.
async function recordOutcome(
  reason: SuppressionReason,
  // deno-lint-ignore no-explicit-any
  event: any,
): Promise<void> {
  const recipient = String(event?.data?.recipient ?? '').toLowerCase()
  if (!recipient) return

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email: recipient, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      event_id: event?.event_id,
      code: suppressError.code,
      message: suppressError.message,
    })
    throw new Error('Failed to record suppression')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: event?.data?.message_id ?? null,
    template_name: 'system',
    recipient_email: recipient,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })

  if (logError) {
    console.error('Failed to insert email_send_log', {
      event_id: event?.event_id,
      code: logError.code,
      message: logError.message,
    })
    throw new Error('Failed to record email send log')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordOutcome('bounce', event)
    },
    'email.complaint': async (event) => {
      await recordOutcome('complaint', event)
    },
    'email.unsubscribed': async (event) => {
      await recordOutcome('unsubscribe', event)
    },
  },
})

Deno.serve((req) => handler(req))
