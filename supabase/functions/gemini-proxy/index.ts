import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // 1. Verify Authentication (Extract JWT from query parameter for WebSockets)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized: Missing token in URL" }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Optional: Verify the token by calling the Supabase Auth API
    // You would initialize a Supabase client here with the Anon key and grab getUser(token)
    // For the sake of the proxy, we enforce that a token must be passed.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 2. Ensure the request is a WebSocket upgrade
    if (req.headers.get("upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 400, headers: corsHeaders });
    }

    // 3. Upgrade the client connection
    const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

    // 4. Securely fetch the master Gemini API key from Supabase Secrets
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY secret is missing in Supabase Edge Function.");
        clientWs.close(1011, "Internal Server Error");
        return response;
    }

    // 5. Build the connection to Google Gemini's BidiService
    const geminiWsUrl = new URL("wss://generativelanguage.googleapis.com/ws/google.cloud.generativelanguage.v1alpha.BidiService/BidiGenerateContent");
    geminiWsUrl.searchParams.set("key", GEMINI_API_KEY);

    const geminiWs = new WebSocket(geminiWsUrl.toString());

    // Wait for Gemini to connect before accepting client messages
    geminiWs.onopen = () => {
        console.log("Connected to Gemini BidiService");
    };

    clientWs.onopen = () => {
        console.log("Client connected to proxy");
    };

    // 6. Pipeline: Client -> Gemini
    clientWs.onmessage = (e) => {
        if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(e.data);
        } else if (geminiWs.readyState === WebSocket.CONNECTING) {
            // Buffer messages if Gemini hasn't finished connecting
            geminiWs.addEventListener('open', () => geminiWs.send(e.data), { once: true });
        }
    };

    // 7. Pipeline: Gemini -> Client
    geminiWs.onmessage = (e) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(e.data);
        }
    };

    // 8. Cleanup & Error Handling
    clientWs.onclose = () => {
        console.log("Client disconnected");
        if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.close();
        }
    };

    geminiWs.onclose = () => {
        console.log("Gemini disconnected");
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
        }
    };

    clientWs.onerror = (e) => console.error("Client WS error:", e);
    geminiWs.onerror = (e) => console.error("Gemini WS error:", e);

    return response;
});
