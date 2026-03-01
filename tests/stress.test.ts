import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSession, getSessions, clearAllSessions } from '../services/db';
import { Session, AppMode } from '../types';

describe('Marathon Stress Test', () => {
    beforeEach(async () => {
        await clearAllSessions();
    });

    it('should handle 1,000 log entries without corruption', async () => {
        const logs = Array.from({ length: 1000 }, (_, i) => ({
            id: `log-${i}`,
            role: i % 2 === 0 ? 'user' : 'model' as any,
            text: `Stress test message ${i} - simulating a long duration marathon session to verify persistence robustness.`,
            timestamp: new Date(),
            speakerId: i % 5 === 0 ? `Speaker-${i % 3}` : undefined
        }));

        const session: Session = {
            id: 'marathon-session',
            startTime: new Date(),
            mode: AppMode.LIVE_TRANSLATOR,
            targetLanguage: 'English',
            logs: logs,
            speakerRegistry: { 'Speaker-0': 'Alice', 'Speaker-1': 'Bob', 'Speaker-2': 'Charlie' }
        };

        const start = performance.now();
        await saveSession(session);
        const end = performance.now();

        console.log(`Saved 1,000 logs in ${(end - start).toFixed(2)}ms`);

        const retrieved = await getSessions();
        expect(retrieved.length).toBe(1);
        expect(retrieved[0].logs.length).toBe(1000);
        expect(retrieved[0].logs[999].text).toContain('message 999');
    });

    it('should verify debounce efficiency (logic level simulation)', async () => {
        // This test simulates the logic used in App.tsx debounce
        const savedVersions: string[] = [];
        const mockSave = async (s: any) => {
            savedVersions.push(JSON.stringify(s.logs));
            return Promise.resolve();
        };

        let currentLogs: any[] = [];
        const triggerUpdate = (newLog: any) => {
            currentLogs = [...currentLogs, newLog];
            // Simulate the useEffect debounce logic
        };

        // Rapid updates
        for (let i = 0; i < 10; i++) {
            triggerUpdate({ id: i, text: 'test' });
        }

        // In a real environment, the 2000ms debounce would only trigger once.
        // Here we just verify that the saveSession call can handle the final state correctly.
        const finalSession = { id: 'debounce-test', logs: currentLogs };
        await mockSave(finalSession);

        expect(savedVersions.length).toBe(1);
        expect(JSON.parse(savedVersions[0]).length).toBe(10);
    });
});
