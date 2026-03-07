/// <reference types="vite/client" />

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const supabaseUrl = isLocal ? `${window.location.origin}/supabase-api` : import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize only if keys are provided (prevents crashes in local dev before setup)
export const getSupabase = async (): Promise<any> => {
    console.log('Attempting Supabase Init', {
        url: supabaseUrl,
        key: supabaseAnonKey ? '[PRESENT]' : '[MISSING]',
        windowObject: !!(window as any).supabase
    });

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase Initialization Failed: Missing URL or Key');
        return null;
    }

    // Load from esm.sh which we know works since React loads from it
    try {
        console.log('Fetching Supabase from esm.sh module...');
        // @ts-ignore
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        console.log('Supabase ESM load success');
        return createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
        console.error('Failed to load Supabase from esm.sh', err);
        return null;
    }
};
