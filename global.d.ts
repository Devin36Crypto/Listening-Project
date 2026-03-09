// Extends the global Window object to include the 'aistudio' property used in App.tsx
export { };

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        aistudio?: any;
    }
}
