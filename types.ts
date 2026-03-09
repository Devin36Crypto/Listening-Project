export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export enum AppMode {
  LIVE_TRANSLATOR = 'LIVE_TRANSLATOR',
  TRANSCRIBER = 'TRANSCRIBER',
  CONTEXT_AWARE = 'CONTEXT_AWARE',
  OFFLINE_MODE = 'OFFLINE_MODE',
  LOCKED = 'LOCKED'
}
export type NoiseLevel = 'off' | 'low' | 'high';
export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
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
export interface DeviceInfo {
  type: 'phone' | 'watch' | 'earbuds' | 'tablet' | 'laptop' | 'standard';
  model?: string;
  isHost?: boolean;
}

export interface PeerNode {
  id: string;
  name: string;
  device: DeviceInfo;
  status: 'online' | 'offline' | 'connecting' | 'connected' | 'latent';
  lastSeen: Date;
  distance?: number;
  role: 'primary' | 'secondary' | 'ambient';
  confidence?: number;
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

export interface PeerNode {
  id: string;
  name: string;
  position: { x: number; y: number };
  lastSeen: number;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

