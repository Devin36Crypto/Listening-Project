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
    createChannelMerger = vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    createAnalyser = vi.fn().mockReturnValue({
        fftSize: 1024,
        smoothingTimeConstant: 0.75,
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    createBufferSource = vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
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
vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { });

// Mock MediaStream
class MediaStreamMock {
    id = 'mock-stream';
    active = true;
    getTracks = vi.fn().mockReturnValue([]);
    getAudioTracks = vi.fn().mockReturnValue([]);
    getVideoTracks = vi.fn().mockReturnValue([]);
}
vi.stubGlobal('MediaStream', MediaStreamMock);

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue(new MediaStreamMock()),
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

// Mock MediaMetadata
class MediaMetadataMock {
    title = '';
    artist = '';
    album = '';
    artwork = [];
    constructor(init?: Partial<MediaMetadataMock>) {
        if (init) {
            Object.assign(this, init);
        }
    }
}
vi.stubGlobal('MediaMetadata', MediaMetadataMock);
