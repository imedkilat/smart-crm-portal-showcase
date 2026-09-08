# Engineering Decisions

Smart CRM Portal started as an automation-heavy CRM project and gradually became a broader backend automation exercise. These are some of the decisions that shaped the system.

## Keep AI separate from authoritative state

The system treats AI as an assistant, not as the database authority.

AI may produce:

- lead quality classification
- intent signals
- summaries
- recommendations
- follow-up drafts
- contextual answers

But durable state such as permissions, workspace ownership, billing state, task completion, and pipeline position remains application-controlled.

### Why

LLM output is probabilistic. Letting a model own critical identifiers or business truth would make data integrity dependent on prompt behavior.

## Resolve authorization on the trusted side

The browser can request a workspace context, but the server must prove that the authenticated user belongs to it.

### Why

A frontend workspace selector is a convenience feature, not an access-control mechanism. A user should not gain access simply by changing a request payload or URL value.

## Design repeated requests to be safe

Automation calls that can create duplicate writes or expensive side effects use idempotency patterns.

A simplified rule is:

```text
same logical operation + same idempotency key
                     ↓
             one business effect
```

### Why

Retries are normal in distributed systems. Users double-click, browsers retry, workflow engines retry, and networks time out after a server may already have completed the work.

The system should not assume that one HTTP request always equals one unique business event.

## Treat rate limiting and billing limits as different concerns

Protective rate limits help prevent bursts and abuse.

Plan quotas and entitlements answer whether a workspace is allowed to use a feature and how much usage its subscription includes.

They may both reject a request, but they solve different problems.

## Fail closed around protection layers

If authorization or a critical protection check cannot be evaluated, the system should not silently continue with a privileged action.

### Why

A protection service becoming unavailable should not accidentally become a bypass.

## Keep outbound communication behind launch controls

Automated external communication carries more risk than an internal CRM update.

The system therefore uses concepts such as:

- disabled / simulation / live modes
- explicit workspace enablement
- per-run and daily limits
- entitlement checks
- idempotency
- provider configuration checks
- audit records for attempts

### Why

The safest way to test an email automation is not to hope the recipient list is correct. Simulation lets the full rendering and logging path be exercised before network delivery is allowed.

## Make scheduled automation observable

Scheduled workflows need heartbeats and execution telemetry because there may be no visible user action when they stop working.

Useful automation states include:

- succeeded
- suppressed
- failed
- stale / waiting

A suppressed run can be healthy when writes are intentionally disabled. That distinction matters when building an operations dashboard.

## Separate orchestration from synchronous product logic

Not everything belongs in n8n, and not everything belongs in backend code.

I use backend code when I need strong guarantees around authentication, authorization, validation, and transactional state. I use n8n when the problem is primarily multi-step orchestration across AI, schedules, APIs, and external systems.

### Practical split

```text
Backend boundary:
  Who can do this?
  Is this request valid?
  Is it safe to execute?

n8n orchestration:
  What sequence of steps should happen next?
  Which external systems need to be coordinated?
  What AI or scheduled work is involved?
```

## Test the boundaries, not just the happy path

The project includes regression thinking around cases such as:

- Workspace A attempting to access Workspace B data
- repeated requests using the same logical event
- automation running while writes are disabled
- missing or stale workflow telemetry
- external provider failures
- plan or entitlement restrictions
- malformed inputs

The goal is not just to prove that a button works once. It is to prove that the system behaves predictably when the assumptions around that button are violated.

## Public vs private implementation

This repository explains the decisions and contains sanitized examples. The production implementation remains private because it includes operational details that are unnecessary for evaluating the engineering approach, such as workflow exports, exact endpoints, rollout configuration, and complete database policies.
