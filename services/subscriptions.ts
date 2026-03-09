/// <reference types="vite/client" />
import { Purchases, ErrorCode } from "@revenuecat/purchases-js";
import type { Offerings, Package, CustomerInfo, EntitlementInfo } from "@revenuecat/purchases-js";
import { getSupabase } from './supabase';
import { getPlatformType, PlatformType } from '../utils/platform';
import { discoveryService } from './DiscoveryService';

// RevenueCat public key from environment
const REVENUECAT_U_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY;

// Pricing Constants (Initial Launch: Android & Desktop Only)
export const PRICING = {
    android_mobile: { base: 4, addon: 4 },
    android_tablet: { base: 6, addon: 5 },
    desktop: { base: 8, addon: 6 }
};

let purchasesInstance: Purchases | null = null;

// ─── Initialization ─────────────────────────────────────────

export const initSubscriptions = async (): Promise<Purchases | null> => {
    if (purchasesInstance) return purchasesInstance;

    if (!REVENUECAT_U_KEY) {
        console.warn('RevenueCat Public Key is missing from environment variables.');
        return null;
    }

    try {
        const supabase = await getSupabase();
        let appUserId: string | undefined;

        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                appUserId = session.user.id;
            }
        }

        if (!appUserId) {
            appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
        }

        purchasesInstance = Purchases.configure({
            apiKey: REVENUECAT_U_KEY,
            appUserId: appUserId,
        });

        return purchasesInstance;
    } catch (err) {
        console.error('Failed to initialize RevenueCat:', err);
        return null;
    }
};

// ─── Entitlements & Pricing ─────────────────────────────────

/**
 * Gets or sets the first launch date of the application.
 */
export const getFirstLaunchDate = (): Date => {
    const stored = localStorage.getItem('lp_first_launch');
    if (stored) return new Date(stored);

    const now = new Date();
    localStorage.setItem('lp_first_launch', now.toISOString());
    return now;
};

export interface DetailedSubscriptionStatus {
    isPro: boolean;
    isTrial: boolean;
    trialDaysRemaining: number;
    hasExpired: boolean;
    platform: PlatformType;
    basePrice: number;
    addonPrice: number;
    extraDevicesCount: number;
    totalMonthlyCost: number;
    expiryDate: string | null;
}

/**
 * Calculates a detailed subscription status including platform-specific pricing and trials.
 */
export const getDetailedSubscriptionStatus = async (): Promise<DetailedSubscriptionStatus> => {
    const platform = getPlatformType();
    const prices = PRICING[platform];
    const firstLaunch = getFirstLaunchDate();
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - firstLaunch.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

    // Default fallback (Free/Trial state)
    let status: DetailedSubscriptionStatus = {
        isPro: false,
        isTrial: diffDays < 3,
        trialDaysRemaining: Math.max(0, 3 - diffDays),
        hasExpired: diffDays >= 3,
        platform,
        basePrice: prices.base,
        addonPrice: prices.addon,
        extraDevicesCount: 0,
        totalMonthlyCost: 0,
        expiryDate: null
    };

    try {
        const purchases = await initSubscriptions();
        if (!purchases) return status;

        const customerInfo: CustomerInfo = await purchases.getCustomerInfo();
        const entitlement: EntitlementInfo | undefined = customerInfo.entitlements.active['pro'];

        if (entitlement) {
            status.isPro = true;
            status.hasExpired = false; // Reset if they are Pro
            status.expiryDate = entitlement.expirationDate ? entitlement.expirationDate.toString() : null;
            status.isTrial = false; // If they are Pro, they are not currently in the "Free Trial" state (they are Pro)

            // Check for trial (RevenueCat trial period is usually reflected in product ID or period type)
            // For this UI, we assume if it's new and within 3 days, it's trial-eligible logic
            const now = new Date();
            const start = entitlement.latestPurchaseDate ? new Date(entitlement.latestPurchaseDate) : new Date();
            const diffDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 3600 * 24));

            if (diffDays <= 3) {
                status.isTrial = true;
                status.trialDaysRemaining = 3 - diffDays;
            }
        }

        // Count extra devices from discovery service
        const activeNodes = discoveryService.getActiveNodes();
        // Base device (this one) is included, count all others as extra lines
        status.extraDevicesCount = activeNodes.length;

        status.totalMonthlyCost = status.isPro
            ? prices.base + (status.extraDevicesCount * prices.addon)
            : 0;

        return status;
    } catch (err) {
        console.error('Failed to get detailed status:', err);
        return status;
    }
};

/**
 * Checks if the current user has an active "pro" entitlement.
 */
export const isProUser = async (): Promise<boolean> => {
    try {
        const purchases = await initSubscriptions();
        if (!purchases) return false;
        return await purchases.isEntitledTo('pro');
    } catch {
        return false;
    }
};

// ─── Offerings & Purchase ───────────────────────────────────

export const getOfferings = async (): Promise<Offerings | null> => {
    try {
        const purchases = await initSubscriptions();
        if (!purchases) return null;
        return await purchases.getOfferings();
    } catch (err) {
        console.error('Failed to fetch offerings:', err);
        return null;
    }
};

export const purchasePackage = async (
    rcPackage: Package,
    email?: string
): Promise<CustomerInfo | null> => {
    try {
        const purchases = await initSubscriptions();
        if (!purchases) throw new Error('RevenueCat not initialized');

        const result = await purchases.purchase({
            rcPackage,
            customerEmail: email,
        });

        return result.customerInfo;
    } catch (err: unknown) {
        if (
            err &&
            typeof err === 'object' &&
            'errorCode' in err &&
            (err as { errorCode: number }).errorCode === ErrorCode.UserCancelledError
        ) {
            return null;
        }
        console.error('Purchase failed:', err);
        throw err;
    }
};

// ─── Database Status (Supabase) ─────────────────────────────

export interface SubscriptionStatus {
    status: 'active' | 'expired' | 'cancelled' | 'billing_retry' | 'paused' | 'inactive';
    product_id: string | null;
    current_period_end: string | null;
}

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    const fallback: SubscriptionStatus = {
        status: 'inactive',
        product_id: null,
        current_period_end: null,
    };

    try {
        const supabase = await getSupabase();
        if (!supabase) return fallback;

        const { data, error } = await supabase
            .from('subscriptions')
            .select('status, product_id, current_period_end')
            .single();

        if (error || !data) return fallback;

        return {
            status: data.status,
            product_id: data.product_id,
            current_period_end: data.current_period_end,
        };
    } catch {
        return fallback;
    }
};
