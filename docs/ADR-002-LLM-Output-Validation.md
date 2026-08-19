# ADR-002: LLM Output Validation

## Status

Accepted

## Decision

Every structured LLM response must pass through extraction, Zod validation, business validation, and then database persistence.

## Rationale

LLMs can return malformed JSON, omit required fields, or add unsupported facts. The application should never persist malformed or fabricated AI data.

## Consequences

- AI features require explicit schemas.
- Failed validation should retry once, then return a graceful error.
- Numeric match scores must be calculated by backend logic, not by the LLM.
