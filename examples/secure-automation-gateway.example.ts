type AuthenticatedUser = {
  id: string
}

type WorkspaceMembership = {
  workspaceId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

type GatewayDependencies = {
  authenticate: (request: Request) => Promise<AuthenticatedUser | null>
  membershipsForUser: (userId: string) => Promise<WorkspaceMembership[]>
  reserveIdempotencyKey: (key: string, userId: string) => Promise<'reserved' | 'duplicate'>
  consumeRateLimit: (workspaceId: string, userId: string) => Promise<boolean>
  invokeWorkflow: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function validIdempotencyKey(value: string | null) {
  if (!value) return null
  const key = value.trim()
  return /^[A-Za-z0-9:_-]{8,128}$/.test(key) ? key : null
}

export async function handleAutomationRequest(
  request: Request,
  deps: GatewayDependencies,
) {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const user = await deps.authenticate(request)
  if (!user) {
    return json(401, { error: 'Authentication required' })
  }

  const requestedWorkspaceId = request.headers.get('x-workspace-id')
  const memberships = await deps.membershipsForUser(user.id)
  const membership = memberships.find(
    (item) => item.workspaceId === requestedWorkspaceId,
  )

  if (!membership) {
    return json(403, { error: 'Workspace access denied' })
  }

  if (membership.role === 'viewer') {
    return json(403, { error: 'This role cannot run automation' })
  }

  const idempotencyKey = validIdempotencyKey(
    request.headers.get('x-idempotency-key'),
  )

  if (!idempotencyKey) {
    return json(400, { error: 'Valid idempotency key required' })
  }

  const reservation = await deps.reserveIdempotencyKey(
    idempotencyKey,
    user.id,
  )

  if (reservation === 'duplicate') {
    return json(200, {
      ok: true,
      duplicate: true,
      message: 'This logical operation was already accepted.',
    })
  }

  const allowed = await deps.consumeRateLimit(membership.workspaceId, user.id)
  if (!allowed) {
    return json(429, { error: 'Rate limit reached' })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid JSON payload' })
  }

  // Trusted identity is injected here instead of accepting it from the browser.
  const workflowPayload = {
    ...body,
    trusted: {
      userId: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
    },
  }

  const result = await deps.invokeWorkflow(workflowPayload)
  return json(200, { ok: true, result })
}
