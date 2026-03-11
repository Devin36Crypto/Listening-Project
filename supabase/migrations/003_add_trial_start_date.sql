-- Add trial_start_date to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;

-- Update status check to include 'trialing'
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('active','expired','cancelled','billing_retry','paused','inactive','trialing'));
