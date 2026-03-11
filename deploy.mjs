import fs from 'fs';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = "uydybhioyjdmncvixsoc";
const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
};

async function deployFunction(slug) {
    const CODE_PATH = `supabase/functions/${slug}/index.ts`;
    const BASE_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`;

    if (!fs.existsSync(CODE_PATH)) {
        console.error(`❌ Source code not found: ${CODE_PATH}`);
        return;
    }

    console.log(`Reading function code for ${slug}...`);
    const body = fs.readFileSync(CODE_PATH, 'utf8');

    // Check if function already exists
    const checkRes = await fetch(`${BASE_URL}/${slug}`, { headers: HEADERS });
    const exists = checkRes.ok;

    const method = exists ? 'PATCH' : 'POST';
    const url = exists ? `${BASE_URL}/${slug}` : BASE_URL;
    console.log(`Function ${slug} ${exists ? 'exists — updating' : 'not found — creating'}...`);

    const res = await fetch(url, {
        method,
        headers: HEADERS,
        body: JSON.stringify({
            slug: slug,
            name: slug,
            body,
            verify_jwt: true,
        }),
    });

    const data = await res.json();

    if (res.ok) {
        console.log(`✅ ${slug} deployed successfully!`);
    } else {
        console.error(`❌ ${slug} deployment failed:`, data);
    }
}

async function main() {
    if (!TOKEN) {
        console.error("❌ SUPABASE_ACCESS_TOKEN environment variable is required.");
        process.exit(1);
    }

    const functions = ["gemini-proxy", "revenuecat-webhook"];
    for (const f of functions) {
        await deployFunction(f);
    }
}

main().catch(console.error);

