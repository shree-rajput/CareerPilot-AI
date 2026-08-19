# ADR-005: Interview Processing

## Status

Accepted

## Decision

AI mock interviews will generate questions dynamically and store each answered question separately from the session summary.

## Rationale

Separate question records keep transcripts, answer feedback, ideal answers, and communication metrics queryable without making the session document too large.

## Consequences

- The interviewer can adapt to previous answers.
- Long-term progress tracking becomes simpler.
- Future scaling can move transcription and answer analysis into background workers.
