---
status: testing
phase: 06-history-view-and-recommendations
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
  - 06-03-SUMMARY.md
started: 2026-03-11T22:05:00Z
updated: 2026-03-11T22:45:00Z
---

## Current Test

number: 4
name: Add-Back Works From History or Recommendations
expected: |
  Tapping a history item or recommendation should add it back to the obvious current list in one action, otherwise require a chooser. If the item already exists on the chosen list, quantity should increase on an active row or a new active row should be created, and a subtle confirmation toast should appear.
awaiting: user response

## Tests

### 1. History Is Grouped and Collapsed
expected: Open `/anbefalinger`. The page should show a history section where past shopping is grouped by date, sessions are collapsed by default, and store-first headers appear when store data exists.
result: pass

### 2. Recommendations Show Correct State
expected: In `Anbefalinger`, the recommendations area should either show a direct cold-start message about 10 sessions, a prompt to open a list, or a compact blended list of practical suggestions depending on available data.
result: pass

### 3. BottomNav Opens Anbefalinger
expected: From a list page, tapping the `Anbefalinger` tab in BottomNav should open the live recommendations/history route instead of a disabled placeholder.
result: pass

### 4. Add-Back Works From History or Recommendations
expected: Tapping a history item or recommendation should add it back to the obvious current list in one action, otherwise require a chooser. If the item already exists on the chosen list, quantity should increase and a subtle confirmation toast should appear.
result: pending

## Summary

total: 4
passed: 3
issues: 0
pending: 1
skipped: 0

## Gaps

none
