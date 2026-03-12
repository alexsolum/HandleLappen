# T01: Plan 01

**Slice:** S04 — **Milestone:** M001

## Description

Build the server-side barcode lookup foundation for Phase 4: cache table, authenticated Supabase Edge Function, Kassal primary lookup, Open Food Facts fallback, Gemini normalization, and Wave 0 barcode test scaffolding.

Purpose: This plan establishes the single trusted lookup pipeline the scanner and manual EAN entry will both call. Without it, the client would either expose secrets or duplicate provider logic.
Output: One migration, one Edge Function with shared normalization helpers, and barcode fixtures/tests that executor plans can reuse.
