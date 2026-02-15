export interface LogMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  translated?: boolean;
  isError?: boolean;
}

export enum AppMode {
  LIVE_TRANSLATOR = 'LIVE_TRANSLATOR', // Live API (Simultaneous)
  TRANSCRIBER = 'TRANSCRIBER', // Gemini 3 Flash (STT)
  CONTEXT_AWARE = 'CONTEXT_AWARE' // Gemini 3 Flash + Search
}

export interface AudioConfig {
  sampleRate: number;
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type NoiseLevel = 'off' | 'low' | 'high';

export interface Settings {
  targetLanguage: string;
  voice: VoiceName;
  autoSpeak: boolean;
  noiseCancellationLevel: NoiseLevel;
}