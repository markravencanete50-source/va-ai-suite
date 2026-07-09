# VA AI Suite

AI console for VA services. The model runs **inside the browser** (WebLLM + WebGPU) — no AI API, no inference bills. Firebase = database, GitHub = repo, Vercel = hosting.

## Modules

| Module | Status | Stack |
|---|---|---|
| Suggestions (captions / SEO / ICP) | ✅ Live | @mlc-ai/web-llm, JSON mode → Firestore |
| Documents (proposal / SOW / onboarding / case study → docx / pptx / pdf) | ✅ Live | WebLLM draft + docx, pptxgenjs, @react-pdf/renderer (all client-side) |
| Invoices (branded PDF, draft→sent→paid) | ✅ Live | @react-pdf/renderer + Firestore `invoices` |
| Social scheduler | ✅ Live | Firestore `posts` + daily Vercel Cron → optional `MAKE_WEBHOOK_URL` for real publishing |
| Prospects / market rates | ✅ Live | Firestore `prospects` + `scripts/import-prospects.mjs` CSV importer |

## Setup

1. `npm install`
2. Create a Firebase project → enable **Firestore** → Project settings → add a Web app → copy config.
3. `cp .env.local.example .env.local` and fill in the Firebase values.
4. `npm run dev` → http://localhost:3000/suggestions

First generation downloads the model (~1.8GB, Llama 3.2 3B q4) and caches it in the browser. After that it's instant. Requires Chrome/Edge desktop with WebGPU. Low-RAM machine? Switch `MODEL_ID` in `lib/webllm/engine.ts` to `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`.

## Deploy

1. Push to GitHub.
2. Import the repo in Vercel → add the same env vars (plus `CRON_SECRET`).
3. Deploy. `vercel.json` registers the 5-minute cron for the social publisher.
4. Paste `firestore.rules` into Firebase console → Firestore → Rules. Tighten to `request.auth != null` once Auth is added.

## Notes

- `next.config.mjs` sets COOP/COEP headers — required for WebGPU/SharedArrayBuffer. Don't remove.
- Social publishing: the daily cron POSTs due posts to `MAKE_WEBHOOK_URL` (a Make.com custom webhook that routes to each platform). Without it, posts stay queued and you publish manually via the ✓ button.
- Never run scrapers from Vercel. Keep them in `/scripts`, run on your PC, write to Firestore with the Admin SDK.
- Reference repos: gitroomhq/postiz-app (social providers), al1abb/invoify (invoice UI), joeyism/linkedin_scraper (prospects).
