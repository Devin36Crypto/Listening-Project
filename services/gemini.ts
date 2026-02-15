import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { 
  MODEL_TTS, 
  MODEL_TRANSCRIBE, 
  MODEL_SEARCH, 
  MODEL_FAST 
} from "../constants";

// Helper to get client
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Text-to-Speech using Gemini 2.5 Flash TTS
 */
export const speakText = async (text: string, voiceName: string = 'Kore'): Promise<ArrayBuffer | null> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;

  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

/**
 * High-quality Transcription using Gemini 3 Flash
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL_TRANSCRIBE,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: `
              Analyze the following audio.
              
              1. **Verbatim Transcription**: Write down exactly what was said.
              2. **Cultural & Linguistic Analysis**:
                 - Identify the specific dialect or regional accent (e.g., US Southern, Cockney, Mexican Spanish).
                 - Note any slang, idioms, or cultural references used (referencing social media trends, history, or street culture).
                 - Explain any specific US-based community usage (e.g., Spanglish).
              3. **Emotional Profile**:
                 - Describe the speaker's tone (e.g., sarcastic, aggressive, pleading, joyful).
                 - Describe the pitch and speed.
              
              Output Format: Markdown.
            `
          }
        ]
      }
    });
    return response.text || "No transcription available.";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "Error transcribing audio.";
  }
};

/**
 * Fast translation/response using Gemini Flash Lite
 */
export const fastTranslate = async (text: string, targetLang: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Translate the following text to ${targetLang}. Only output the translation, nothing else.\n\nText: "${text}"`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Fast Translate Error:", error);
    return text;
  }
};

/**
 * Contextual Search using Grounding
 */
export const getContextualInfo = async (query: string): Promise<{text: string, sources: string[]}> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL_SEARCH,
      contents: `Explain the cultural context or provide more info about this topic: "${query}". Keep it brief.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources: string[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push(chunk.web.uri);
      }
    });

    return {
      text: response.text || "No info found.",
      sources
    };
  } catch (error) {
    console.error("Search Error:", error);
    return { text: "Error fetching context.", sources: [] };
  }
};