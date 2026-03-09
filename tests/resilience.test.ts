import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioSession } from '../hooks/useAudioSession';

// Mock the GoogleGenAI SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      live: {
        connect: vi.fn().mockImplementation(({ callbacks }) => {
          // Simulate an immediate error
          if (callbacks && callbacks.onerror) {
            callbacks.onerror(new Error('Network disconnected'));
          }
          return Promise.resolve({
            sendRealtimeInput: vi.fn(),
            disconnect: vi.fn()
          });
        })
      }
    })),
    Modality: { AUDIO: 'AUDIO' }
  };
});

describe('Network Resilience', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let addLog: any;
  const mockSettings = { targetLanguage: 'English', voice: 'Puck', autoSpeak: true, noiseCancellationLevel: 'high' as const, pushToTalk: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockMode = 'LIVE_TRANSLATOR' as any;
  const onOfflineChunks = vi.fn();

  beforeEach(() => {
    addLog = vi.fn();
  });

  it('should log system error on connection failure', async () => {
    const { result } = renderHook(() => useAudioSession(mockSettings, mockMode, addLog, onOfflineChunks, 'valid_key'));

    await act(async () => {
      try {
        await result.current.startSession();
      } catch {
        // Expected to fail due to mock or handled gracefully
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const systemErrorCall = addLog.mock.calls.find((call: any) =>
      call[0] === 'system' && call[2] === true
    );
    expect(systemErrorCall).toBeDefined();
  });
});
