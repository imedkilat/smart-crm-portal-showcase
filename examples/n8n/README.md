# Sanitized n8n Example

This folder contains a deliberately simplified workflow that demonstrates how I structure automation without exposing the production Smart CRM workflows.

## Included example

[`sanitized-lead-intake.example.json`](sanitized-lead-intake.example.json)

The example shows a safe public version of this pattern:

```text
Webhook
  ↓
Validate trusted source fields
  ↓
Classification step
  ↓
Merge source data + allowed classification output
  ↓
Respond
```

The public example intentionally:

- uses a demo webhook path
- contains no credentials
- contains no production URLs
- contains no database writes
- contains no customer or workspace identifiers
- replaces the production AI step with deterministic demo logic
- keeps the important architectural idea that source fields and AI-produced fields are handled separately

## Why not publish the production workflow?

The real Smart CRM workflow includes operational configuration, internal routing, integration details, credential references, production endpoints, telemetry logic, and safeguards that do not need to be public for a recruiter to evaluate the engineering approach.

The purpose of this file is proof-of-work, not a production deployment package.

## Importing

The JSON follows the shape of an n8n workflow export and is intended as a readable demo. Depending on the n8n version, minor node-version adjustments may be required after import.
