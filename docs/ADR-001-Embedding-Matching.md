# ADR-001: Embedding-Based Matching

## Status

Accepted

## Decision

CareerPilot AI will use local embeddings and cosine similarity for resume-to-job matching instead of asking an LLM to invent a match score.

## Rationale

Embeddings can capture semantic overlap when the resume and job description use different wording. The deterministic backend scoring engine remains the source of truth for numeric scores, while an LLM may explain the result after validation.

## Consequences

- Match scores are explainable and reproducible.
- API cost is reduced because embedding generation can run locally.
- The system must store evidence for each important requirement.
