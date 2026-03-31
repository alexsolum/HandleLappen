---
created: 2026-03-31T12:55:32.853Z
title: Remember store auto-selection consent
area: general
files: []
---

## Problem

Automatic store selection (and location permission acceptance) has to be re-enabled every time a user enters a list. This is repetitive and blocks smooth use of the app for returning users.

## Solution

Persist a user-level preference for automatic store selection once the user accepts it, and reuse it on subsequent list visits so the user does not need to re-enable the setting each time. Ensure the preference is stored server-side and applied before the list page prompts for opt-in again.
