# Token rules

- Brand colors, spacing, typography, radius, and shadow values enter the token model.
- Generated component CSS references variables; raw brand values stay in `tokens.css`.
- Alias resolution must reject cycles, missing references, and type mismatches.
- Similar values are suggestions, never silent semantic merges.
- Token output order and CSS variable names must be stable.
