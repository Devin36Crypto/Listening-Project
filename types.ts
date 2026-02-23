export interface LogMessage {
  id: string;
  role: 'user' | 'model' | 'system' | 'date-marker';
  text: string;
  timestamp: Date;
  translated?: boolean;
  isError?: boolean;
  speakerId?: string; // The ID assigned by AI (e.g., "Spanish Speaker 1")
}

export enum AppMode {
  LIVE_TRANSLATOR = 'LIVE_TRANSLATOR', // Live API (Simultaneous)
  TRANSCRIBER = 'TRANSCRIBER', // Gemini 3 Flash (STT)
  CONTEXT_AWARE = 'CONTEXT_AWARE', // Gemini 3 Flash + Search
  OFFLINE_MODE = 'OFFLINE_MODE' // On-device ML
}

export interface AudioConfig {
  sampleRate: number;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type NoiseLevel = 'off' | 'low' | 'high';

export interface Settings {
  targetLanguage: string;
  voice: VoiceName;
  autoSpeak: boolean;
  noiseCancellationLevel: NoiseLevel;
  pushToTalk: boolean;
}

export interface Session {
  id: string;
  startTime: Date;
  endTime?: Date;
  mode: AppMode;
  targetLanguage: string;
  logs: LogMessage[];
  speakerRegistry: Record<string, string>;
}