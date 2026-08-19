# ADR-004: Free-Tier AI Architecture

## Status

Accepted

## Decision

AI providers will be isolated behind provider interfaces and configured through environment variables. The core project must not depend on paid APIs.

## Rationale

The project has a strict zero-rupee requirement. Provider isolation allows switching models when free-tier availability or model IDs change.

## Consequences

- API keys are server-only.
- AI endpoints need per-user limits.
- Free-tier exhaustion must produce a clear unavailable state instead of attempting paid usage.
