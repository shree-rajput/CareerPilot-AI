# ADR-003: Local Computer Vision

## Status

Accepted

## Decision

Interview visual analysis will run in the browser with MediaPipe or equivalent local tools. Webcam frames will not be sent to paid vision APIs.

## Rationale

Local analysis protects the zero-cost requirement, reduces privacy risk, and keeps the system demo-friendly.

## Consequences

- Visual metrics are approximate communication signals.
- The UI must avoid unsupported claims about confidence, personality, or mental state.
- Browser permission errors need clear fallback states.
