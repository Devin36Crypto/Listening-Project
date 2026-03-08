/// <reference types="vite/client" />

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const supabaseUrl = isLocal ? `${window.location.origin}/supabase-api` : import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSupabase = async (): Promise<any> => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase not configured: missing URL or anon key.');
        return null;
    }

    try {
        // @ts-expect-error — dynamic CDN import has no type declarations
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        return createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
        console.error('Failed to load Supabase from esm.sh', err);
        return null;
    }
};
