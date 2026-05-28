-- 005_feedback_device_build.sql
-- Adds device + build columns to the feedback table so the automated post-build
-- smoke test (tests/smoke.spec.mjs) can tag rows it files with the reporting
-- "device" (e.g. "auto-smoke") and the app build/version it failed on.
-- Applied to project fubrwttjgbthjarzledr on 2026-05-28.

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS build text;
