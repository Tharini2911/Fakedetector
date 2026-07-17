/*
# Create analyses table for fake news detection history

1. Purpose
- Stores the result of each fake-news analysis performed by a signed-in user.
- Each row belongs to the user who created it (multi-user, owner-scoped).

2. New Tables
- `analyses`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with cascade delete)
  - `input_type` (text: 'text' | 'url')
  - `content` (text: the analyzed text or the submitted URL)
  - `verdict` (text: 'real' | 'fake')
  - `confidence` (numeric, 0-100, confidence score percentage)
  - `signals` (jsonb: breakdown of heuristic signals and their contributions)
  - `created_at` (timestamptz, defaults to now())

3. Security
- Enable RLS on `analyses`.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- `user_id` defaults to `auth.uid()` so frontend inserts that omit user_id still satisfy the WITH CHECK policy.
*/

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type text NOT NULL CHECK (input_type IN ('text', 'url')),
  content text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('real', 'fake')),
  confidence numeric(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_analyses" ON analyses;
CREATE POLICY "select_own_analyses" ON analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_analyses" ON analyses;
CREATE POLICY "insert_own_analyses" ON analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_analyses" ON analyses;
CREATE POLICY "update_own_analyses" ON analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_analyses" ON analyses;
CREATE POLICY "delete_own_analyses" ON analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS analyses_user_id_created_at_idx
  ON analyses (user_id, created_at DESC);