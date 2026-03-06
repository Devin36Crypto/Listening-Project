export { };

declare global {
    interface Window {
        aistudio?: {
            hasSelectedApiKey?: () => Promise<boolean>;
            openSelectKey?: () => Promise<void>;
        };
    }

    interface ImportMetaEnv {
        readonly VITE_GEMINI_API_KEY: string;
        readonly VITE_SENTRY_DSN?: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}
