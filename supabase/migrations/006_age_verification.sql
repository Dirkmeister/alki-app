-- ═══════════════════════════════════════════════════════════
-- ALKI — Age attestation persistence (audit item 6.7-a)
-- NOT yet applied to the live project. Run this in the Supabase SQL
-- Editor for project fubrwttjgbthjarzledr BEFORE deploying the client
-- changes that read/write these columns, or returning users will be
-- re-gated on every load (age_verified reads false until the column
-- exists and a save populates it).
-- ═══════════════════════════════════════════════════════════

-- 6.7-a — the 18+ attestation, persisted server-side instead of living
-- only in ephemeral React state. Defaults false so every existing row is
-- treated as "not yet attested": those users pass the age gate once more
-- (a single tap) and the next profile auto-save records the attestation.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_verified boolean NOT NULL DEFAULT false;

-- date_of_birth is reserved for a future date-of-birth capture flow. The
-- current gate is a binary 18+ attestation (no DOB input), so the client
-- does not populate this column yet — it is added now so the schema is
-- ready when DOB capture ships. Nullable; no backfill.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- No RLS change required: profiles RLS already scopes every row to its
-- owner (auth.uid() = id), so age_verified inherits the same protection.
