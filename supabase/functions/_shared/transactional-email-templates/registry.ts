/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as weeklyAdminReport } from './weekly-admin-report.tsx'
import { template as weeklyDigest } from './weekly-digest.tsx'
import { template as contributionValidated } from './contribution-validated.tsx'
import { template as proposalApproved } from './proposal-approved.tsx'
import { template as eventPublished } from './event-published.tsx'
import { template as submissionRejected } from './submission-rejected.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'weekly-admin-report': weeklyAdminReport,
  'weekly-digest': weeklyDigest,
  'contribution-validated': contributionValidated,
  'proposal-approved': proposalApproved,
  'event-published': eventPublished,
  'submission-rejected': submissionRejected,
}
