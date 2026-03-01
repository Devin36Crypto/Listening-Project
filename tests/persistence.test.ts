import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSession, getSessions, clearAllSessions } from '../services/db';
import { Session, AppMode } from '../types';

describe('Persistence Layer (IndexedDB)', () => {
    const mockSession: Session = {
        id: 'test-session-1',
        startTime: new Date(),
        mode: AppMode.LIVE_TRANSLATOR,
        targetLanguage: 'English',
        logs: [
            { id: '1', role: 'user', text: 'Hello', timestamp: new Date() },
            { id: '2', role: 'model', text: 'Hi', timestamp: new Date() }
        ],
        speakerRegistry: {}
    };

    beforeEach(async () => {
        await clearAllSessions();
    });

    it('should save and retrieve a session', async () => {
        await saveSession(mockSession);
        const sessions = await getSessions();
        expect(sessions.length).toBe(1);
        expect(sessions[0].id).toBe(mockSession.id);
        expect(sessions[0].logs.length).toBe(2);
    });

    it('should overwrite a session when saving with the same ID', async () => {
        await saveSession(mockSession);
        const updatedSession = { ...mockSession, targetLanguage: 'Spanish' };
        await saveSession(updatedSession);

        const sessions = await getSessions();
        expect(sessions.length).toBe(1);
        expect(sessions[0].targetLanguage).toBe('Spanish');
    });

    it('should clear all sessions', async () => {
        await saveSession(mockSession);
        await clearAllSessions();
        const sessions = await getSessions();
        expect(sessions.length).toBe(0);
    });
});
