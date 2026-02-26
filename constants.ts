export const APP_NAME = 'ListeningProject';
export const APP_VERSION = '2.1.0';

// Model IDs
export const MODEL_LIVE = 'gemini-2.0-flash-exp';
export const MODEL_TTS = 'gemini-1.5-flash';
export const MODEL_TRANSCRIBE = 'gemini-1.5-flash';
export const MODEL_FAST_TRANSLATE = 'gemini-1.5-flash';
export const MODEL_SEARCH = 'gemini-1.5-pro';

// Audio Settings
export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'pt-BR', label: 'Portuguese' },
  { code: 'ru-RU', label: 'Russian' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ar-XA', label: 'Arabic' },
  { code: 'vi-VN', label: 'Vietnamese' },
  { code: 'th-TH', label: 'Thai' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'tr-TR', label: 'Turkish' },
];

export const VOICES = [
  { id: 'Puck', label: 'Puck (Energetic)' },
  { id: 'Charon', label: 'Charon (Deep)' },
  { id: 'Kore', label: 'Kore (Soft)' },
  { id: 'Fenrir', label: 'Fenrir (Balanced)' },
  { id: 'Aoede', label: 'Aoede (Musical)' },
];

export const NOISE_LEVELS = [
  { id: 'off', label: 'Off' },
  { id: 'low', label: 'Low (Indoor)' },
  { id: 'high', label: 'High (Outdoor/Cafe)' },
];
