// Models
export const MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-12-2025';
export const MODEL_TRANSCRIBE = 'gemini-3-flash-preview';
export const MODEL_FAST = 'gemini-flash-lite-latest'; // Mapped from 2.5-flash-lite requirement
export const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
export const MODEL_SEARCH = 'gemini-3-flash-preview'; // For grounding
export const MODEL_FLASH = 'gemini-3-flash-preview';

// Audio defaults
export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'Chinese (Mandarin)', label: 'Chinese (Mandarin)' },
  { code: 'Chinese (Cantonese)', label: 'Chinese (Cantonese)' },
  { code: 'Tagalog', label: 'Tagalog (Filipino)' },
  { code: 'Vietnamese', label: 'Vietnamese' },
  { code: 'Arabic', label: 'Arabic' },
  { code: 'French', label: 'French' },
  { code: 'Korean', label: 'Korean' },
  { code: 'Russian', label: 'Russian' },
  { code: 'German', label: 'German' },
  { code: 'Haitian Creole', label: 'Haitian Creole' },
  { code: 'Hindi', label: 'Hindi' },
  { code: 'Portuguese', label: 'Portuguese' },
  { code: 'Italian', label: 'Italian' },
  { code: 'Polish', label: 'Polish' },
  { code: 'Urdu', label: 'Urdu' },
  { code: 'Japanese', label: 'Japanese' },
  { code: 'Persian', label: 'Persian (Farsi)' },
  { code: 'Gujarati', label: 'Gujarati' },
  { code: 'Telugu', label: 'Telugu' },
  { code: 'Bengali', label: 'Bengali' },
  { code: 'Thai', label: 'Thai' },
  { code: 'Greek', label: 'Greek' },
  { code: 'Punjabi', label: 'Punjabi' },
  { code: 'Tamil', label: 'Tamil' },
  { code: 'Armenian', label: 'Armenian' },
  { code: 'Serbo-Croatian', label: 'Serbo-Croatian' },
  { code: 'Hebrew', label: 'Hebrew' },
  { code: 'Hmong', label: 'Hmong' },
  { code: 'Khmer', label: 'Khmer' },
  { code: 'Navajo', label: 'Navajo' },
  { code: 'Hungarian', label: 'Hungarian' },
  { code: 'Lao', label: 'Lao' },
  { code: 'Yiddish', label: 'Yiddish' },
  { code: 'Malayalam', label: 'Malayalam' },
  { code: 'Swahili', label: 'Swahili' },
  { code: 'Amharic', label: 'Amharic' },
  { code: 'Somali', label: 'Somali' },
  { code: 'Nepali', label: 'Nepali' },
  { code: 'Ukrainian', label: 'Ukrainian' },
  { code: 'Dutch', label: 'Dutch' },
  { code: 'Romanian', label: 'Romanian' },
  { code: 'Indonesian', label: 'Indonesian' },
  { code: 'Turkish', label: 'Turkish' },
  { code: 'Ilocano', label: 'Ilocano' },
  { code: 'Yoruba', label: 'Yoruba' },
  { code: 'Igbo', label: 'Igbo' },
  { code: 'Marathi', label: 'Marathi' },
  { code: 'Kannada', label: 'Kannada' },
  { code: 'Oromo', label: 'Oromo' },
];

export const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];