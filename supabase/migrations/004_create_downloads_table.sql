-- Create downloads tracking table
CREATE TABLE IF NOT EXISTS public.downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add index for stats queries
CREATE INDEX IF NOT EXISTS downloads_created_at_idx ON public.downloads (created_at);

-- Set up Row Level Security (RLS)
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the landing page)
CREATE POLICY "Allow anonymous inserts to downloads" ON public.downloads
    FOR INSERT WITH CHECK (true);

-- Allow public read access to counts
CREATE POLICY "Allow public read access to downloads" ON public.downloads
    FOR SELECT USING (true);
