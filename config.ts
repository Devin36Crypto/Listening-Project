export const getApiKey = (): string | null => {
    return import.meta.env.VITE_GEMINI_API_KEY || null;
};

export const validateApiKey = (key: string | null): boolean => {
    if (!key) return false;
    // Basic validation for Gemini API key format (often starts with AIza)
    return key.length > 30 && key.startsWith('AIza');
};

export const CONFIG = {
    APP_NAME: 'ListeningProject',
    VERSION: '1.0.0-optimized',
};
