# Iceland Jobs Hunter

> An automated job hunting engine for finding seasonal work in Iceland — with accommodation scoring, pair-friendly filtering, and personalized 1:1 email outreach to hotels and guesthouses.

---

## What is this?

**Iceland Jobs Hunter** is a full-stack web app built with one specific goal: get hired in Iceland as fast as possible, ideally with accommodation included, ideally for two people traveling together.

It does three things automatically:

1. **Scrapes job listings** from 5 Icelandic job portals, scores each job by relevance, and translates everything to Polish
2. **Discovers employers** (hotels, guesthouses, hostels) via Google Places and extracts contact emails from their websites
3. **Sends personalized job applications** — one email per employer, with the hotel name and region filled in, asking about work availability, accommodation, and whether two people can be hired

This is not a job board aggregator. It's an active outreach tool built to simulate what a motivated job seeker would do manually — at scale.

---

## How it works

### Pipeline overview

```
Job Portals                    Google Places API
     │                               │
     ▼                               ▼
Job Scraper (Playwright)      Hotel Discovery
     │                               │
     ▼                               ▼
Score + Translate (GPT-4o)    Email Extraction (Playwright)
     │                               │
     ▼                               ▼
/dashboard/jobs               /dashboard/employers
                                      │
                                      ▼
                              Outreach Queue
                                      │
                                      ▼
                              Gmail API (1:1 sends)
```

### Job scraping

Pulls listings from:
- **Alfred.is** — largest Icelandic job portal
- **EURES** — EU job mobility portal (filtered to Iceland)
- **island.is** — Directorate of Labour
- **jobs.is** — Icelandic job board
- **storf.is** — additional Icelandic listings

Each job is scored automatically:

| Score | What it measures | Weight in priority |
|-------|----------------|--------------------|
| Housing score | "staff accommodation", "housing provided", "live-in", etc. | 35% |
| Junior fit | No experience required, training provided, seasonal, entry-level | 25% |
| Pair-friendliness | Multiple positions, couples welcome, seasonal team | 20% |
| English-friendly | English accepted, no Icelandic required | 10% |
| Recency | Days since posting (capped at 14 days) | 10% |

All jobs are auto-translated to Polish via GPT-4o-mini after every sync.

### Employer discovery

1. **Google Places search** — queries like "hotel in Iceland", "hostel in Reykjavik", etc. (5+ regional queries)
2. **Website crawl** — visits each hotel's website with Playwright, follows `/contact`, `/jobs`, `/careers` pages
3. **Email extraction** — finds all email addresses, ranks them by type:
   - Priority 1: `jobs@`, `hr@`, `careers@`, `work@`
   - Priority 2: `info@`, `reception@`, `contact@`
   - Priority 3: everything else
4. **Confidence score** — 0-100 based on email type and whether a careers page was found

### Outreach engine

- Select any number of employers from the table
- Choose a template (general / accommodation-focused / two-people)
- Edit the template in-browser — changes save to localStorage as your personal preset
- Placeholders: `{{employer_name}}` and `{{region_line}}` are filled per employer at send time
- Emails go through Gmail API (authenticated via OAuth2) — **one per employer, not BCC**
- 3-second delay between sends
- Daily limit: 50 emails/day
- Full queue panel in admin: pending / sending / sent / failed, with real-time auto-refresh

---

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Server Actions, Route Handlers) |
| Language | TypeScript strict |
| Styling | Tailwind CSS dark theme |
| Database | Supabase (Postgres + Auth + RLS) |
| Scraping | Playwright + Cheerio |
| Email sending | Gmail API (OAuth2, `messages.send`) |
| Place discovery | Google Places API (New) |
| Translation | OpenAI GPT-4o-mini |
| Validation | Zod |
| Deployment | Vercel (with cron jobs) |

---

## Project structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── jobs/          ← Scored job listings with filters
│   │   ├── employers/     ← Hotel list + email outreach
│   │   └── admin/         ← Sync, discovery, outreach queue
│   └── api/
│       ├── cron/sync-jobs/        ← Scheduled job sync
│       ├── discovery/run/         ← Places + email crawl (2 steps)
│       ├── outreach/queue/        ← Add to send queue
│       └── outreach/send-batch/   ← Process queue, send via Gmail
├── providers/
│   ├── alfred/     ← Playwright scraper
│   ├── eures/      ← axios API client
│   ├── island/     ← Playwright scraper
│   ├── jobs-is/    ← Playwright scraper
│   └── storf/      ← Playwright scraper
├── discovery/
│   ├── places-searcher.ts    ← Google Places queries
│   ├── employer-dedup.ts     ← Dedup by place_id, domain, slug
│   ├── website-crawler.ts    ← Playwright email extraction
│   └── email-ranker.ts       ← Priority scoring
└── lib/
    ├── google/
    │   ├── places.ts           ← Places API v1 (New)
    │   ├── gmail.ts            ← sendEmail + createDraft
    │   └── gmail-templates.ts  ← 3 personalized templates
    ├── scoring/
    │   ├── job-scorer.ts
    │   ├── housing-detector.ts
    │   └── pair-detector.ts
    └── openai/
        └── translator.ts       ← GPT-4o-mini batch translation
```

---

## Setup

### Requirements
- Node.js 20+
- Supabase account (free tier works)
- Google Cloud account (Places API + Gmail API)
- OpenAI API key (for translations)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/Iceland-jobs.git
cd Iceland-jobs
npm install
npx playwright install chromium
```

### 2. Environment variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-...

# Google
GOOGLE_PLACES_API_KEY=AIza...
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Cron
CRON_SECRET=random_secret_string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database migrations

In Supabase SQL Editor, run each file in `supabase/migrations/` in order:
- `0001_initial_schema.sql` — jobs, employers, sync_runs, etc.
- `0002_indexes.sql` — performance indexes
- `0003_rls_policies.sql` — row level security
- `0004_translation_fields.sql` — Polish translation columns
- `0005_outreach_queue.sql` — email send queue

### 4. Google Cloud setup

1. Enable **Places API (New)** and **Gmail API**
2. Create OAuth 2.0 Client ID → Web application
3. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
4. OAuth consent screen: External, scope `https://www.googleapis.com/auth/gmail.send`

### 5. Run

```bash
npm run dev
# → http://localhost:3000
```

Login with your Supabase user, then:
- **Admin** → Synchronize jobs → Discover employers (Step 1 + Step 2)
- **Jobs** → Browse scored listings
- **Employers** → Select hotels → Send 1:1 applications

---

## Cron schedule (Vercel)

```json
"crons": [
  { "path": "/api/cron/sync-jobs", "schedule": "0 8 * * *" },
  { "path": "/api/cron/discover-employers", "schedule": "0 2 * * 0" }
]
```

Jobs sync daily at 08:00 UTC. Employer discovery runs every Sunday at 02:00 UTC.

> `maxDuration = 300` requires Vercel Pro. On Hobby tier, reduce to 60 and limit scraper batch sizes.

---

## Available scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run typecheck    # TypeScript check (must pass before deploy)
```

---

## License

MIT
