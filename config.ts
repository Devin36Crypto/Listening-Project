export const APP_NAME = 'Listening Project';
export const APP_VERSION = '1.0.0';

export const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const isValidApiKey = (key: string) => {
  return key.length >= 30;
};
