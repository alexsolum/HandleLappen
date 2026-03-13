# T04: Plan 04

**Slice:** S06 — **Milestone:** M001

## Description

Close the Phase 6 UAT gap where add-back can attach to an already checked item row, causing the restored item to appear in the done section instead of the active shopping list.

Purpose: the Phase 6 browsing loop is only correct if add-back restores actionable unchecked items. Quantity increment should apply to an existing active row, not resurrect a checked row as still checked.

Output: corrected add-back mutation behavior, no regression in chooser/toast flow, and targeted E2E coverage for unchecked restoration.
