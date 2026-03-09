import fs from 'fs';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = "uydybhioyjdmncvixsoc";
const FUNCTION_SLUG = "gemini-proxy";
const CODE_PATH = "supabase/functions/gemini-proxy/index.ts";
const BASE_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`;

const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
};

async function deploy() {
    console.log("Reading function code...");
    const body = fs.readFileSync(CODE_PATH, 'utf8');

    // Check if function already exists
    const checkRes = await fetch(`${BASE_URL}/${FUNCTION_SLUG}`, { headers });
    const exists = checkRes.ok;

    const method = exists ? 'PATCH' : 'POST';
    const url = exists ? `${BASE_URL}/${FUNCTION_SLUG}` : BASE_URL;
    console.log(`Function ${exists ? 'exists — updating' : 'not found — creating'}...`);

    const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
            slug: FUNCTION_SLUG,
            name: FUNCTION_SLUG,
            body,
            verify_jwt: true,
        }),
    });

    const data = await res.json();

    if (res.ok) {
        console.log("✅ Successfully deployed!", data);
    } else {
        console.error("❌ Failed:", data);
    }
}

deploy().catch(console.error);
