import { Session, AppMode } from '../types';
import { encryptData, decryptData, arrayBufferToBase64, base64ToArrayBuffer } from './encryption';

const DB_NAME = 'listening-project-db';
const STORE_NAME = 'sessions';
const DB_VERSION = 2;

export const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
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
        request.onerror = () => reject(request.error);
    });
};

export const saveSession = async (session: Session, vaultKey?: string | null): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
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

export const getSessions = async (vaultKey?: string | null): Promise<Session[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = async () => {
            const rawResult = request.result as any[];
            const processedSessions: Session[] = [];

            for (const item of rawResult) {
                if (item.isEncrypted) {
                    if (vaultKey) {
                        try {
                            const bytes = base64ToArrayBuffer(item.encryptedData);
                            const decryptedStr = await decryptData(bytes, vaultKey);
                            const session = JSON.parse(decryptedStr);
                            
                            // Re-hydrate dates
                            session.startTime = new Date(session.startTime);
                            if (session.endTime) session.endTime = new Date(session.endTime);
                            if (session.logs) {
                              session.logs.forEach((log: any) => {
                                if (log.timestamp) log.timestamp = new Date(log.timestamp);
                              });
                            }
                            processedSessions.push(session);
                        } catch (e) {
                            console.error(`Failed to decrypt session ${item.id}`, e);
                        }
                    } else {
                        // Return a stub for locked sessions
                        processedSessions.push({
                            id: item.id,
                            startTime: new Date(item.startTime),
                            mode: AppMode.LOCKED,
                            targetLanguage: 'LOCKED',
                            logs: [],
                            speakerRegistry: {}
                        });
                    }
                } else {
                    // Plaintext session
                    if (typeof item.startTime === 'string') item.startTime = new Date(item.startTime);
                    if (typeof item.endTime === 'string') item.endTime = new Date(item.endTime);
                    processedSessions.push(item);
                }
            }

            // Sort by most recent
            resolve(processedSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
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

export const getStorageUsage = async (vaultKey?: string | null): Promise<number> => {
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
