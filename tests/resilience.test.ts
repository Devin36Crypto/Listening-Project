import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioSession } from '../hooks/useAudioSession';

// Mock the GoogleGenAI SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        startChat: vi.fn().mockReturnValue({
          sendMessage: vi.fn().mockRejectedValue(new Error('Network disconnected'))
        })
      })
    }))
  };
});

describe('Network Resilience', () => {
    let addLog: any;

    beforeEach(() => {
        addLog = vi.fn();
    });

    it('should log system error on connection failure', async () => {
        const { result } = renderHook(() => useAudioSession(addLog, 'valid_key'));

        await act(async () => {
            try {
                await result.current.startSession();
            } catch (e) {
                // Expected to fail due to mock
            }
        });

        expect(addLog).toHaveBeenCalledWith(
            expect.stringContaining('Critical Error'),
            'system',
            true
        );
    });
});
