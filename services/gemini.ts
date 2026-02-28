import { GoogleGenAI } from '@google/genai';
import { MODEL_TTS, MODEL_TRANSCRIBE, MODEL_FAST_TRANSLATE, MODEL_SEARCH } from '../constants';
const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
  if (!key) throw new Error('API_KEY_MISSING');
  return key;
};
const getClient = () => new GoogleGenAI({ apiKey: getApiKey() });
// Note: Direct TTS is handled via the Multimodal Live API in useAudioSession.ts.
// Non-live transcription and translation services are provided below.
export const transcribeAudio = async (audioData: string): Promise<string> => {
  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL_TRANSCRIBE,
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: audioData } },
        { text: "Transcribe this audio accurately. Identify speakers if possible." }
      ]
    }
  });
  return response.text || "";
};
export const fastTranslate = async (text: string, targetLanguage: string): Promise<string> => {
  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL_FAST_TRANSLATE,
    contents: `Translate to ${targetLanguage}: ${text}`
  });
  return response.text || "";
};
export const getContextualInfo = async (query: string, context: string): Promise<string> => {
  const genAI = getClient();
  const response = await genAI.models.generateContent({
    model: MODEL_SEARCH,
    contents: `Context: ${context}\n\nQuery: ${query}`
  });
  return response.text || "";
};
