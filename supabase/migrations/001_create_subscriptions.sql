-- =============================================================
-- Phase 2: Subscriptions table + Row Level Security
-- Run this in your Supabase SQL Editor (supabase.com → SQL)
-- =============================================================

-- 1. Create the subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenuecat_id TEXT,
  product_id    TEXT,
  entitlement   TEXT DEFAULT 'pro',
  status        TEXT NOT NULL DEFAULT 'inactive'
                  CHECK (status IN ('active','expired','cancelled','billing_retry','paused','inactive')),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Users can only read their own subscription row
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Service-role (Edge Functions) gets full CRUD access
CREATE POLICY "Service role full access"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Auto-update the updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
