export type PlatformType = 'android_mobile' | 'android_tablet' | 'desktop';

/**
 * Detects the current device platform type with a focus on Android and Desktop.
 * Note: iOS is currently not supported for the initial release.
 */
export const getPlatformType = (): PlatformType => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);

    if (isAndroid) {
        // Simple heuristic for Android Tablet vs Mobile
        if (Math.min(window.innerWidth, window.innerHeight) >= 768) {
            return 'android_tablet';
        }
        return 'android_mobile';
    }

    // Default to Desktop if not Android
    return 'desktop';
};
