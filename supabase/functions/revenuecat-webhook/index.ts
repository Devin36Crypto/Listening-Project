import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * RevenueCat Webhook Edge Function
 * 
 * Listens for subscription events from RevenueCat and upserts the
 * `subscriptions` table accordingly.
 *
 * Required Supabase secrets:
 *   REVENUECAT_WEBHOOK_SECRET  – shared auth header value set in RC dashboard
 *   SUPABASE_URL               – auto-provided
 *   SUPABASE_SERVICE_ROLE_KEY  – auto-provided
 */

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

// Map RevenueCat event types → our subscription status values
const STATUS_MAP: Record<string, string> = {
    INITIAL_PURCHASE: "active",
    RENEWAL: "active",
    NON_RENEWING_PURCHASE: "active",
    UNCANCELLATION: "active",
    CANCELLATION: "cancelled",
    EXPIRATION: "expired",
    BILLING_ISSUE: "billing_retry",
    PRODUCT_CHANGE: "active",
};

serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Only accept POST
    if (req.method !== "POST") {
        return new Response("Method not allowed", {
            status: 405,
            headers: corsHeaders,
        });
    }

    // ── 1. Verify webhook authenticity ───────────────────────────
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    const authHeader = req.headers.get("authorization");

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
        console.error("Webhook auth failed");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // ── 2. Parse the RevenueCat event ────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const event = body.event as Record<string, unknown> | undefined;
    if (!event) {
        return new Response(JSON.stringify({ error: "Missing event" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const eventType = event.type as string;
    const appUserId = event.app_user_id as string;
    const productId = event.product_id as string | undefined;
    const expirationAtMs = event.expiration_at_ms as number | undefined;
    const purchasedAtMs = event.purchased_at_ms as number | undefined;

    console.log(`RevenueCat event: ${eventType} for user ${appUserId}`);

    const newStatus = STATUS_MAP[eventType];
    if (!newStatus) {
        // Event type we don't track (e.g. TRANSFER, SUBSCRIPTION_PAUSED)
        console.log(`Ignoring event type: ${eventType}`);
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // ── 3. Upsert to subscriptions table ─────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const periodStart = purchasedAtMs
        ? new Date(purchasedAtMs).toISOString()
        : null;
    const periodEnd = expirationAtMs
        ? new Date(expirationAtMs).toISOString()
        : null;

    const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
            {
                user_id: appUserId,
                revenuecat_id: appUserId,
                product_id: productId ?? null,
                status: newStatus,
                current_period_start: periodStart,
                current_period_end: periodEnd,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        );

    if (upsertError) {
        console.error("Upsert failed:", upsertError);
        return new Response(
            JSON.stringify({ error: "Database error", details: upsertError.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }

    console.log(`Subscription updated: ${appUserId} → ${newStatus}`);

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
});
