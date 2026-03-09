import { useState, useEffect, useCallback } from 'react';
import {
    isProUser,
    getOfferings,
    purchasePackage,
    getSubscriptionStatus,
    getDetailedSubscriptionStatus,
    type SubscriptionStatus,
    type DetailedSubscriptionStatus,
} from '../services/subscriptions';
import type { Offerings, Package } from '@revenuecat/purchases-js';

interface UseSubscriptionReturn {
    /** Whether the user has an active Pro subscription */
    isPro: boolean;
    /** Full subscription status from the database */
    subscription: SubscriptionStatus;
    /** Detailed breakdown for UI (pricing, trial, platform) */
    details: DetailedSubscriptionStatus | null;
    /** Available offerings from RevenueCat */
    offerings: Offerings | null;
    /** Whether data is still loading */
    loading: boolean;
    /** Initiate a purchase for the given package */
    purchase: (pkg: Package, email?: string) => Promise<boolean>;
    /** Refresh subscription status */
    refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
    const [isPro, setIsPro] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionStatus>({
        status: 'inactive',
        product_id: null,
        current_period_end: null,
    });
    const [details, setDetails] = useState<DetailedSubscriptionStatus | null>(null);
    const [offerings, setOfferings] = useState<Offerings | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [pro, status, offers, detailedStatus] = await Promise.all([
                isProUser(),
                getSubscriptionStatus(),
                getOfferings(),
                getDetailedSubscriptionStatus(),
            ]);
            setIsPro(pro);
            setSubscription(status);
            setOfferings(offers);
            setDetails(detailedStatus);
        } catch (err) {
            console.error('Failed to load subscription data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const purchase = useCallback(
        async (pkg: Package, email?: string): Promise<boolean> => {
            try {
                const result = await purchasePackage(pkg, email);
                if (result) {
                    await refresh();
                    return true;
                }
                return false;
            } catch {
                return false;
            }
        },
        [refresh]
    );

    return { isPro, subscription, details, offerings, loading, purchase, refresh };
}
