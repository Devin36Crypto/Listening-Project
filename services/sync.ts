import { getSupabase } from './supabase';
import { getRawEncryptedSessions, openDB } from './db';

export const backupToCloud = async (): Promise<number> => {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to backup.");

    const rawLocalSessions = await getRawEncryptedSessions();

    if (rawLocalSessions.length === 0) {
        return 0;
    }

    const payload = rawLocalSessions.map(session => ({
        user_id: user.id,
        session_id: session.id,
        encrypted_data: session.encryptedData,
        // Optional: you could pack the exact original startTime here if needed
    }));

    // Upsert the encrypted payloads to Supabase
    // Requires the session_backups table to exist in Supabase with session_id as a constraint
    const { error } = await supabase
        .from('session_backups')
        .upsert(payload, { onConflict: 'session_id, user_id' } as any);

    if (error) throw error;

    return payload.length;
};

export const restoreFromCloud = async (): Promise<number> => {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to restore.");

    const { data, error } = await supabase
        .from('session_backups')
        .select('*')
        .eq('user_id', user.id);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const db = await openDB();
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');

    for (const row of data) {
        store.put({
            id: row.session_id,
            encryptedData: row.encrypted_data,
            isEncrypted: true,
            startTime: new Date(row.updated_at || Date.now())
        });
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(data.length);
        tx.onerror = () => reject(tx.error);
    });
};
