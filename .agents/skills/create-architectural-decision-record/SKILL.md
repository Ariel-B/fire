---
name: create-architectural-decision-record
description: 'Create an Architectural Decision Record (ADR) document matching this project''s existing ADR format in docs/ADRs/.'
---

# Create Architectural Decision Record

Create an ADR document for `${input:DecisionTitle}` following this project's established ADR conventions.

## Inputs

- **Decision Title**: `${input:DecisionTitle}`
- **Context** (the problem / why this decision is needed): `${input:Context}`
- **Decision** (what was chosen and why): `${input:Decision}`
- **Alternatives** (other options that were considered): `${input:Alternatives}`
- **Deciders** (who was involved): `${input:Deciders}`

## Input Validation

If any required inputs above are missing and cannot be inferred from conversation history, ask the user before proceeding.

## Requirements

- Use the project's existing ADR format — **bold inline markdown fields**, not YAML front matter
- Plain bullet points for consequences — do NOT use coded labels like `POS-001` or `NEG-001`
- Include Positive, Negative, and Neutral consequences
- Document each alternative with Description, Pros, Cons, and "Why not chosen"
- Save in `docs/ADRs/` using the naming convention `ADR-NNN-title-slug.md`
  - Determine NNN by finding the highest existing number in `docs/ADRs/` and incrementing by 1
  - Use 3-digit zero-padded numbers (e.g., ADR-022, ADR-023)
- Bold the chosen status, leave others plain: `**Accepted** | Proposed | Deprecated | Superseded | Rejected`

## Required Document Structure

Use exactly this template:

```md
# ADR-NNN: [Decision Title]

**Status**: **Accepted** | Proposed | Deprecated | Superseded | Rejected

**Date**: YYYY-MM-DD

**Deciders**: [Names/roles]

**Technical Story**: [Link to related issue/PR, or brief description]

## Context

[Problem statement: what issue, constraint, or requirement necessitates this decision. Include relevant background.]

## Decision

[The chosen solution. Be specific about what will be implemented and key rationale for selecting it over alternatives.]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Trade-off 1]
- [Trade-off 2]

### Neutral
- [Neutral change 1]

## Alternatives Considered

### Alternative 1: [Name]
**Description**: [Brief description]

**Pros**:
- [Pro 1]

**Cons**:
- [Con 1]

**Why not chosen**: [Reason]

## Implementation Notes

[Specific implementation details, migration paths, or technical considerations relevant to this decision.]

## References

- [Related ADR links, e.g., [ADR-008](./ADR-008-strategy-pattern-calculations.md)]
- [External documentation or standards]
```

## Project Context

- Existing ADRs are numbered ADR-001 through ADR-021 — next number is ADR-022
- All ADRs live in `docs/ADRs/` — check current highest number before writing
- See [ADR-TEMPLATE.md](../../../docs/ADRs/ADR-TEMPLATE.md) as the reference template
- See existing ADRs for tone and depth examples (e.g., [ADR-021-money-value-object.md](../../../docs/ADRs/ADR-021-money-value-object.md))
