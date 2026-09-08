type ReservationStore = {
  insert: (record: {
    key: string
    scope: string
    actorId: string
    expiresAt: string
  }) => Promise<'inserted' | 'conflict'>
}

export async function reserveLogicalOperation(
  store: ReservationStore,
  input: {
    key: string
    scope: string
    actorId: string
    ttlMinutes?: number
  },
) {
  const ttlMinutes = input.ttlMinutes ?? 60
  const expiresAt = new Date(
    Date.now() + ttlMinutes * 60 * 1000,
  ).toISOString()

  const result = await store.insert({
    key: input.key,
    scope: input.scope,
    actorId: input.actorId,
    expiresAt,
  })

  if (result === 'conflict') {
    return {
      accepted: false,
      duplicate: true,
      reason: 'logical_operation_already_reserved',
    }
  }

  return {
    accepted: true,
    duplicate: false,
    expiresAt,
  }
}

/*
Why this matters:

A user can double-click.
A browser can retry.
A workflow engine can retry.
A network timeout can occur after the server already completed the work.

Idempotency makes the business operation safe to repeat at the request layer
without automatically repeating the business side effect.
*/
