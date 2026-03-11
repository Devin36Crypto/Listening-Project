import { Session, AppMode } from '../types';
import { encryptData, decryptData, arrayBufferToBase64, base64ToArrayBuffer } from './encryption';

const DB_NAME = 'listening-project-db';
const STORE_NAME = 'sessions';
const DB_VERSION = 2;

// Singleton: cache the DB promise so we open exactly one connection for the app's lifetime.
// Re-opening on every operation wastes resources and can cause race conditions.
let _dbPromise: Promise<IDBDatabase> | null = null;

export const openDB = (): Promise<IDBDatabase> => {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('startTime', 'startTime', { unique: false });
                store.createIndex('isEncrypted', 'isEncrypted');
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            _dbPromise = null; // Reset on failure so next call can retry
            reject(request.error);
        };
    });
    return _dbPromise;
};

export const saveSession = async (session: Session, vaultKey?: string | null): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataToStore: any = session;

    if (vaultKey) {
        // Zero-Knowledge Encryption
        const json = JSON.stringify(session);
        const encrypted = await encryptData(json, vaultKey);

        dataToStore = {
            id: session.id,
            encryptedData: arrayBufferToBase64(encrypted),
            isEncrypted: true,
            startTime: session.startTime // Keep searchable/sortable
        };
    }

    store.put(dataToStore);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getSessions = async (vaultKey?: string | null, limit = 50, offset = 0): Promise<Session[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('startTime');

    // Use a cursor for efficient pagination
    const request = index.openCursor(null, 'prev'); // Most recent first
    let advanced = false;

    return new Promise((resolve, reject) => {
        const results: Session[] = [];
        request.onsuccess = async () => {
            const cursor = request.result;

            if (!cursor) {
                resolve(results);
                return;
            }

            if (offset > 0 && !advanced) {
                advanced = true;
                cursor.advance(offset);
                return;
            }

            const item = cursor.value;
            let processed: Session | null = null;

            if (item.isEncrypted) {
                if (vaultKey) {
                    try {
                        const bytes = base64ToArrayBuffer(item.encryptedData);
                        const decryptedStr = await decryptData(bytes, vaultKey);
                        processed = JSON.parse(decryptedStr);
                        if (processed) {
                            processed.startTime = new Date(processed.startTime);
                            if (processed.endTime) processed.endTime = new Date(processed.endTime);
                            if (processed.logs) {
                                processed.logs.forEach((log: any) => {
                                    if (log.timestamp) log.timestamp = new Date(log.timestamp);
                                });
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to decrypt session ${item.id}`, e);
                    }
                } else {
                    processed = {
                        id: item.id,
                        startTime: new Date(item.startTime),
                        mode: AppMode.LOCKED,
                        targetLanguage: 'LOCKED',
                        logs: [],
                        speakerRegistry: {}
                    };
                }
            } else {
                processed = { ...item };
                if (typeof processed?.startTime === 'string') processed.startTime = new Date(processed.startTime);
                if (typeof processed?.endTime === 'string') processed.endTime = new Date(processed.endTime);
            }

            if (processed) results.push(processed);

            if (results.length < limit) {
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSession = async (id: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const clearAllSessions = async (): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const importSessions = async (sessions: Session[], vaultKey?: string | null): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const session of sessions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let dataToStore: any = session;
        if (vaultKey) {
            const encrypted = await encryptData(JSON.stringify(session), vaultKey);
            dataToStore = {
                id: session.id,
                encryptedData: arrayBufferToBase64(encrypted),
                isEncrypted: true,
                startTime: new Date(session.startTime)
            };
        }
        store.put(dataToStore);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getStorageUsage = async (): Promise<number> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
        request.onsuccess = () => {
            const data = JSON.stringify(request.result);
            resolve(new Blob([data]).size);
        };
        request.onerror = () => resolve(0);
    });
};

export const getRawEncryptedSessions = async (): Promise<{ id: string, encryptedData: string, isEncrypted: boolean, startTime: Date }[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawResult = request.result as any[];
            // Only export the sessions that are already safely encrypted
            const encryptedOnly = rawResult.filter(r => r.isEncrypted);
            resolve(encryptedOnly);
        };
        request.onerror = () => reject(request.error);
    });
};
