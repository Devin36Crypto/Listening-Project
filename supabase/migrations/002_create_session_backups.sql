-- =============================================================
-- Phase 3: Session Backups table + Row Level Security
-- Run this in your Supabase SQL Editor (supabase.com → SQL)
-- =============================================================

-- 1. Create the session_backups table
CREATE TABLE IF NOT EXISTS public.session_backups (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id     UUID NOT NULL,
  encrypted_data TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(session_id, user_id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.session_backups ENABLE ROW LEVEL SECURITY;

-- 3. Users can only see/edit their own backup rows
CREATE POLICY "Users can manage own backups"
  ON public.session_backups
  FOR ALL
  USING (auth.uid() = user_id);

-- 4. Service-role gets full access
CREATE POLICY "Service role full access"
  ON public.session_backups
  FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Auto-update the updated_at timestamp
CREATE TRIGGER on_session_backups_updated
  BEFORE UPDATE ON public.session_backups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
