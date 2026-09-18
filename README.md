# Hungru Pizza Spinner

A QR-code prize wheel for Hungru Pizza Barasat. Customers scan a QR code on a table or receipt, spin the wheel, and win one of six prizes. A restaurant staff member controls the odds and prize content from a password-protected `/admin` panel — no code changes or redeploys needed.

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **Upstash Redis** (free tier, connected via Vercel's Storage tab) — stores the six prize segments
- **jose** — signed admin session cookies
- **zod** — validates admin form saves
- **qrcode** — powers the admin's QR download button

## Local Development

```bash
npm install
```

Copy `.env.local.example` to `.env.local` and fill in:

- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — from an Upstash Redis database (free tier)
- `ADMIN_PASSWORD` — any password you choose
- `ADMIN_COOKIE_SECRET` — a random string, e.g. generated with `openssl rand -base64 32`

> Without Redis env vars set, the app still runs using built-in default segments (read-only — admin saves will fail until Redis is configured).

```bash
npm run dev
```

- Public spinner: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin/login`

```bash
npm run simulate
```

Runs `scripts/simulate-spins.ts` — a quick sanity check that the weighted-random pick roughly matches the configured odds, without needing the browser.

## Deploying to Vercel (Free)

1. Push this repo to GitHub, import it as a new Vercel Project.
2. In the Vercel Project, go to **Storage → Connect Database** → choose the **Upstash Redis** integration (free tier) — this auto-fills the Redis env vars.
3. In **Project → Settings → Environment Variables**, add `ADMIN_PASSWORD` and `ADMIN_COOKIE_SECRET`.
4. Deploy. Visit `/admin/login`, sign in, confirm the six default prizes loaded, and edit labels/images/weights as needed.
5. Open `/admin` and click **Download QR Code** to get a QR PNG pointing at the live site — print it or put it on tables/receipts.

## How Odds Work

Each prize has a `weight`. The chance of winning it is:

```
weight / (sum of all six weights)
```

Weights don't need to add up to 100 — e.g. `[15, 15, 10, 35, 10, 15]` and `[3, 3, 2, 7, 2, 3]` produce identical odds.

The winning prize is always chosen server-side (`POST /api/spin`), so odds can't be inspected or manipulated from the browser.

## Out of Scope / Intentionally Not Built

- Customer accounts
- Spin cooldown / rate-limiting
- Analytics dashboard
- Email capture

Kept out deliberately to match the client's requested minimal scope.
