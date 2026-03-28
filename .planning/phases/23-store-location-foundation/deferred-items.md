# Deferred Items (Out of Scope)

These issues were discovered during Plan 23-01 verification but are outside the files and scope of this plan.

- `src/lib/queries/remembered-items-core.ts`: RPC argument/type mismatch (`p_household_id` unknown; `display_name` missing on inferred row type)
- `tests/item-memory.spec.ts`: implicit `any` parameters (`row`) at multiple lines
- `vite.config.ts`: type mismatch (`boolean` not assignable to expected `string`)

Context:
- Command: `npx tsc --noEmit`
- Date: 2026-03-28
