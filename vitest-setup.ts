import '@testing-library/jest-dom';
import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock AudioContext
class AudioContextMock {
    sampleRate = 16000;
    state = 'suspended';
    close = vi.fn().mockResolvedValue(undefined);
    resume = vi.fn().mockResolvedValue(undefined);
    suspend = vi.fn().mockResolvedValue(undefined);
    createGain = vi.fn().mockReturnValue({
        gain: { value: 1, setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    createMediaStreamSource = vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    audioWorklet = {
        addModule: vi.fn().mockResolvedValue(undefined),
    };
    createMediaElementSource = vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    destination = {};
}
vi.stubGlobal('AudioContext', AudioContextMock);

// Mock AudioWorkletNode
class AudioWorkletNode {
    port = {
        postMessage: vi.fn(),
        onmessage: null,
    };
    connect = vi.fn();
    disconnect = vi.fn();
}
vi.stubGlobal('AudioWorkletNode', AudioWorkletNode);

// Mock HTMLMediaElement.prototype.play
vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
        enumerateDevices: vi.fn().mockResolvedValue([
            { kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' }
        ]),
    },
    writable: true
});

// Mock navigator.wakeLock
Object.defineProperty(navigator, 'wakeLock', {
    value: {
        request: vi.fn().mockResolvedValue({
            release: vi.fn().mockResolvedValue(undefined)
        }),
    },
    writable: true
});

// Mock navigator.mediaSession
Object.defineProperty(navigator, 'mediaSession', {
  value: {
    metadata: null,
    playbackState: 'none',
    setActionHandler: vi.fn(),
  },
  writable: true
});
