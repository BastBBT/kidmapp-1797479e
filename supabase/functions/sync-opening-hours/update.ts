interface WriteError { message: string }
interface LocationUpdateQuery extends PromiseLike<{ error: WriteError | null }> {
  eq(column: string, value: string): LocationUpdateQuery
  or(filter: string): LocationUpdateQuery
  select(columns: string): PromiseLike<{ data: { id: string }[] | null; error: WriteError | null }>
}
interface LocationWriter {
  from(table: 'locations'): { update(values: Record<string, unknown>): LocationUpdateQuery }
}

export function normalizeBusinessStatus(value: unknown): string | null {
  return value === 'OPERATIONAL' || value === 'CLOSED_TEMPORARILY' || value === 'CLOSED_PERMANENTLY'
    ? value
    : null
}

// The hours guard is evaluated at write time, including edits made during the Google request.
export async function writeGoogleUpdate(
  admin: LocationWriter,
  id: string,
  update: Record<string, unknown>,
  force: boolean,
): Promise<'written' | 'skipped_manual' | 'error'> {
  let query = admin.from('locations').update(update).eq('id', id)
  if (!force) query = query.or('opening_hours_source.is.null,opening_hours_source.neq.manuel')
  const { data: written, error } = await query.select('id')
  if (error) {
    console.error('update failed', id, error.message)
    return 'error'
  }
  if (written?.length) return 'written'

  // Activity status is independent of manual hours; never overwrite those hours here.
  const { error: statusError } = await admin.from('locations')
    .update({ business_status: update.business_status })
    .eq('id', id)
  if (statusError) {
    console.error('business status update failed', id, statusError.message)
    return 'error'
  }
  return 'skipped_manual'
}