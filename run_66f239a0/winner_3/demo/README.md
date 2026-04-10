# DebtLens

**Turn your GitHub repo into a one-page executive brief that finally gives engineering leads the dollar figures and business risk scores they need to get budget approved for paying down technical debt.**

DebtLens scans a GitHub repository and generates a stakeholder-ready report that translates technical debt into business-language metrics: dollar cost, delivery risk score, and a prioritized remediation roadmap — so engineering leads can finally get budget approval to fix it.

## What Problem It Solves

Every existing tool (SonarQube, CodeClimate, LinearB) produces engineering-language outputs: issue counts, complexity scores, cycle time. None of them produce CFO-language outputs. DebtLens is the **translation layer** that converts technical signals into an "income statement for technical debt" that survives a 10-minute board meeting.

## Features

- **GitHub Repo Debt Scanner** — paste any public GitHub URL and get a full analysis in under 45 seconds
- **Debt Score (0–100)** — composite score from 5 weighted signals (deps, issues, PR time, commit velocity, age)
- **Business Impact Panel** — estimated annual cost in dollars, delivery risk badge, incidents per quarter
- **Debt Breakdown Table** — up to 5 specific signals with plain-English business implications and DORA/CAST/McKinsey citations
- **Remediation Roadmap** — prioritized action items with engineer-day estimates and projected annual savings
- **PDF Export** — client-side PDF generation via jsPDF, ready to attach to a budget proposal
- **Shareable Links** — persistent report URLs via SQLite, loadable in under 1 second on repeat visits
- **Demo Mode** — three pre-seeded reports (Startup, Enterprise, Healthy) that work with zero API calls

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes (`/api/scan`, `/api/report/[id]`)
- **Database**: SQLite via `better-sqlite3` (file: `debtlens.db`)
- **GitHub API**: `@octokit/rest`
- **Charts**: `recharts` (RadialBar gauge + Bar charts)
- **PDF**: `jsPDF` + `html2canvas` (client-side)
- **Notifications**: `sonner` toast

## Installation & Running

### Prerequisites

- Node.js 18+
- npm

### Steps

```bash
# 1. Clone / enter the project directory
cd debtlens

# 2. Install dependencies
npm install

# 3. (Optional) Add a GitHub token to avoid rate limiting on public repos
#    Create a .env.local file:
echo "GITHUB_TOKEN=ghp_your_token_here" > .env.local

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

The SQLite database (`debtlens.db`) is created automatically on first run. Demo seed data is inserted on first request.

## Walkthrough

### Landing Page

1. Paste any public GitHub repo URL (e.g. `https://github.com/vercel/next.js`)
2. Click **Scan for Debt** — a real-time progress bar shows 5 analysis steps
3. On completion, you're redirected to `/report/{scanId}`

Or click one of the **three demo cards** for an instant report with no API call required.

### Report Dashboard (`/report/{id}`)

The report has four sections:

1. **Debt Score Gauge** — animated 0–100 dial (green ≤30, amber 31–60, red ≥61)
2. **Business Impact Cards** — estimated annual cost, delivery risk badge, incidents per quarter
3. **Metrics Row** — PR merge time vs. DORA benchmark, 90-day commit velocity, outdated deps, open issues
4. **Debt Breakdown** — up to 5 signals with severity badges and business implications citing real research
5. **Remediation Roadmap** — 3 prioritized action items with engineer-days, projected savings, score improvement

### Actions

- **Download PDF** — generates a jsPDF report from the dashboard DOM; suitable for attaching to a budget proposal
- **Copy Link** — copies the `/report/{id}` URL to clipboard with a toast notification

### Demo Reports

| Demo | Score | Est. Annual Cost | Risk |
|------|-------|-----------------|------|
| Startup Accumulation (`/report/demo-startup`) | 71/100 | $340K | High |
| Enterprise Legacy (`/report/demo-enterprise`) | 89/100 | $1.24M | Critical |
| Healthy Modern Stack (`/report/demo-healthy`) | 22/100 | $48K | Low |

All demo reports load instantly from SQLite seed data — no GitHub API calls needed.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub personal access token for higher rate limits | Optional (60 req/hr without) |

## Project Structure

```
app/
  page.tsx              # Landing page with scan form + demo cards
  layout.tsx            # Root layout with Toaster
  report/[id]/
    page.tsx            # Server component: fetches from SQLite
    ReportClient.tsx    # Client component: gauge, charts, PDF, copy
  api/
    scan/route.ts       # POST /api/scan — runs GitHub analysis
    report/[id]/route.ts # GET /api/report/[id] — fetches cached report
lib/
  db.ts                 # SQLite connection + schema init
  seed.ts               # Demo data seeding (3 pre-built reports)
  scorer.ts             # Debt score calculation algorithm
  types.ts              # TypeScript interfaces
components/ui/          # shadcn/ui components
```
