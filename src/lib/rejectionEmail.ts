import { supabase } from '@/integrations/supabase/client';
import type { RejectSubmissionType } from '@/components/admin/RejectDialog';

/**
 * Sends the submission-rejected email to the proposer with the admin's reason.
 * No-op if reason is empty or recipient email is missing.
 * Failures are logged but do not throw — the rejection status update is the source of truth.
 */
export async function sendRejectionEmail(params: {
  submissionType: RejectSubmissionType;
  submissionName: string;
  submissionId: string;
  recipientEmail: string | null;
  recipientName?: string | null;
  reason: string;
}): Promise<{ sent: boolean; error?: string }> {
  const reason = params.reason.trim();
  if (!reason) return { sent: false };
  if (!params.recipientEmail) return { sent: false };

  try {
    const { error } = await supabase.functions.invoke('send-rejection-email', {
      body: {
        submissionType: params.submissionType,
        submissionName: params.submissionName,
        submissionId: params.submissionId,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        reason,
      },
    });
    if (error) {
      console.error('sendRejectionEmail failed', error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err: any) {
    console.error('sendRejectionEmail crashed', err);
    return { sent: false, error: err?.message };
  }
}
