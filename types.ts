export enum AppMode {
  LIVE_TRANSLATOR = 'LIVE_TRANSLATOR',
  TRANSCRIBER = 'TRANSCRIBER',
  CONTEXT_AWARE = 'CONTEXT_AWARE',
  OFFLINE_MODE = 'OFFLINE_MODE',
  LOCKED = 'LOCKED'
}

export type NoiseLevel = 'off' | 'low' | 'high';

export interface Settings {
  targetLanguage: string;
  voice: string;
  autoSpeak: boolean;
  noiseCancellationLevel: NoiseLevel;
  pushToTalk: boolean;
}

export interface LogMessage {
  id: string;
  role: 'user' | 'model' | 'system' | 'date-marker';
  text: string;
  timestamp: Date;
  isError?: boolean;
  speakerId?: string;
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

export interface Speaker {
  id: string;
  name: string;
  color: string;
}
