```json
{
  "problem_id": "prob_017",
  "product_name": "VulnLens",
  "value_prop": "VulnLens scans AI-generated code snippets for OWASP Top 10 vulnerabilities in seconds, giving DevSecOps engineers and security champions a purpose-built gate between Copilot/Claude output and production.",
  "differentiator": "Unlike Snyk or Semgrep — which were designed for human-written code and miss AI-reproduction patterns — VulnLens uses a hybrid deterministic rule engine (regex + AST pattern matching) combined with an LLM that is explicitly prompted to distrust the code it reviews, directly countering the Self-Correction Blind Spot where AI-on-AI review fails 64.5% of the time. Results are returned in under 10 seconds with zero setup, no repo connection, and no enterprise sales call.",
  "mvp_features": [
    {
      "name": "Instant Paste-and-Scan",
      "description": "User pastes a code snippet (up to 500 lines) into a web editor, selects the language, and clicks Scan. The backend runs a two-pass analysis: Pass 1 is a deterministic rule engine checking for 10 canonical AI-reproduction vulnerability patterns (SQL injection via string concat, XSS via innerHTML, MD5/SHA1 usage, hardcoded secrets regex, eval() injection, path traversal, insecure random, log injection, SSRF via unvalidated URL, XXE via unsafe XML parse). Pass 2 sends the snippet to OpenAI GPT-4o with a system prompt that frames the model as an external adversarial auditor reviewing someone else's code, explicitly not the author, to bypass the self-correction blind spot. Results from both passes are merged, deduplicated, and ranked by CVSS-estimated severity.",
      "user_flow": [
        "Step 1: User lands on app, sees a split-screen — left is a code editor with syntax highlighting, right is an empty results panel with placeholder text 'Vulnerabilities will appear here'",
        "Step 2: User pastes AI-generated code (e.g., from GitHub Copilot) into the left editor and selects language from a dropdown (Python, JavaScript, TypeScript, Java, PHP, Go)",
        "Step 3: User clicks the 'Scan for Vulnerabilities' button — button shows a spinner, a status bar reads 'Running deterministic checks...' then 'Running adversarial AI review...'",
        "Step 4: Results panel populates within 8 seconds showing a severity badge summary (e.g., 2 CRITICAL, 1 HIGH, 3 MEDIUM), then a scrollable list of findings",
        "Step 5: Each finding card shows: vulnerability type, OWASP category, the exact line(s) highlighted in the editor, a plain-English explanation of why it is dangerous, and a one-click 'Show Fix' that reveals a corrected code snippet",
        "Step 6: User can click 'Copy Report as Markdown' to export findings for a PR comment or Jira ticket"
      ],
      "acceptance_criteria": [
        "It should return combined results in under 10 seconds for snippets up to 200 lines",
        "It should highlight the exact offending line(s) in the code editor with a red gutter marker",
        "It should display at minimum the vulnerability name, OWASP Top 10 category (e.g., A03:2021 Injection), severity (Critical/High/Medium/Low), and a 2-sentence plain-English explanation",
        "It should show a corrected code snippet for every finding when 'Show Fix' is clicked",
        "It should work without any login or account creation for the first scan",
        "It should gracefully handle the LLM pass failing (timeout/API error) by still showing deterministic results with a notice that AI review was unavailable"
      ]
    },
    {
      "name": "AI-vs-Human Vulnerability Leaderboard (Seed Data Demo)",
      "description": "A pre-populated dashboard tab showing a live-updating leaderboard of the most commonly detected vulnerability patterns across all anonymized scans run through VulnLens. This serves two purposes: (1) it makes the app immediately interesting on first load with real data without requiring a login, and (2) it validates the core thesis — that AI-generated code has distinct vulnerability fingerprints — by surfacing that SQL injection via f-string/template literal and hardcoded JWT secrets appear in 68% and 41% of scans respectively. Data is backed by seeded records in SQLite representing 847 historical scans.",
      "user_flow": [
        "Step 1: User clicks the 'Vulnerability Trends' tab in the top navigation",
        "Step 2: User sees a bar chart of top 10 most frequent vulnerability types detected, sorted by frequency, with counts and percentage of total scans",
        "Step 3: User sees a secondary stat row: total scans run (starts at seeded 847, increments with real scans), average findings per scan (4.2), most dangerous language (PHP, 6.1 avg findings)",
        "Step 4: User can toggle between 'All Languages' and individual language filters to see which languages AI models produce the most vulnerabilities in",
        "Step 5: Each bar in the chart is clickable and opens a drawer showing 2-3 real (sanitized) example code snippets from the seed data that triggered that vulnerability type, making the data tangible"
      ],
      "acceptance_criteria": [
        "It should display leaderboard data on page load without requiring any user action or login",
        "It should show at minimum 10 vulnerability categories with realistic frequency counts from seed data",
        "It should update the total scan count in real-time as new scans are completed in the current session",
        "It should render a responsive bar chart using Recharts with tooltips showing exact counts on hover",
        "It should show example vulnerable code snippets (from seed data) when a bar is clicked, with syntax highlighting"
      ]
    },
    {
      "name": "Scan History & Shareable Report Links",
      "description": "After completing a scan, the system saves results to SQLite (no account required — keyed to a browser-local UUID stored in localStorage). The user sees a 'My Recent Scans' sidebar showing their last 5 scans with timestamp, language, snippet preview (first 60 chars), and severity badge. Each scan gets a unique shareable URL (e.g., /report/abc123) that renders a read-only report page — enabling users to share findings with teammates or paste the link into a PR review. This is the primary viral/growth mechanic and the hook for the freemium upgrade (free users get 5 saved scans; pro users get unlimited + team sharing).",
      "user_flow": [
        "Step 1: After a scan completes, a toast notification appears: 'Report saved — copy shareable link' with a copy icon",
        "Step 2: User clicks copy and gets a URL like https://vulnlens.dev/report/xK9mP2 copied to clipboard",
        "Step 3: User or teammate opens the URL in any browser — sees a read-only report page with the original code (syntax highlighted), all findings, severity summary, and a 'Scan your own code' CTA button",
        "Step 4: The left sidebar shows 'Recent Scans' with thumbnail cards for the last 5 scans — clicking any card reloads that scan's full results",
        "Step 5: When a user hits their 5th saved scan, a subtle upgrade prompt appears: 'You've used 5/5 free saved reports — upgrade to Pro for unlimited history and team workspaces'"
      ],
      "acceptance_criteria": [
        "It should generate a unique 6-character alphanumeric report ID for every scan and store it in SQLite",
        "It should make the report accessible at /report/[id] within 1 second of scan completion",
        "It should render the shareable report page without requiring the viewer to have any account or session",
        "It should display the last 5 scans in the sidebar, persisted via localStorage UUID across page refreshes",
        "It should show an upgrade prompt (non-blocking, dismissible) when the user completes their 5th scan",
        "It should include a 'Scan your own code' CTA on the shared report page that pre-populates the editor with the reported snippet for easy remixing"
      ]
    }
  ],
  "out_of_scope": [
    "GitHub/GitLab repository integration or CI/CD pipeline webhook (v2 — requires OAuth and async job queue)",
    "User accounts, authentication, or team workspaces (v2 — use Clerk or NextAuth)",
    "Custom rule authoring or rule management UI (v2)",
    "DAST / runtime scanning — this MVP is static analysis only",
    "IDE plugins (VS Code, JetBrains) — post-MVP distribution channel",
    "Compliance report generation (SOC2, GDPR mapping) — enterprise v3 feature",
    "Bulk file upload or multi-file project scanning (v2)",
    "Webhook/Slack notifications (v2)",
    "Self-hosted / on-premise deployment option (enterprise v3)"
  ],
  "demo_format": "web_app",
  "tech_stack": {
    "frontend": "Next.js 14 (App Router) + Tailwind CSS + shadcn/ui components",
    "backend": "Next.js API routes (serverless functions) — /api/scan and /api/report/[id]",
    "database": "SQLite with better-sqlite3 (file-based, zero config, perfect for single-server MVP)",
    "key_libraries": [
      "@codemirror/react (code editor with syntax highlighting and line gutter markers)",
      "recharts (bar charts for vulnerability leaderboard)",
      "openai (GPT-4o API for adversarial AI review pass)",
      "better-sqlite3 (synchronous SQLite access in API routes)",
      "nanoid (generating short unique report IDs)",
      "zod (input validation on API routes)",
      "react-hot-toast (scan completion / copy link notifications)",
      "lucide-react (icons)",
      "clsx + tailwind-merge (conditional class utilities)"
    ]
  },
  "data_model": {
    "entities": [
      {
        "name": "Scan",
        "fields": [
          "id: string (nanoid 6-char, primary key, used in shareable URL)",
          "session_id: string (UUID from localStorage, groups scans by anonymous user)",
          "language: string (python | javascript | typescript | java | php | go)",
          "code_snippet: text (raw pasted code, max 20000 chars)",
          "snippet_preview: string (first 60 chars of code_snippet for sidebar display)",
          "status: string (pending | complete | error)",
          "created_at: integer (Unix timestamp ms)",
          "total_findings: integer (count of merged findings)",
          "critical_count: integer",
          "high_count: integer",
          "medium_count: integer",
          "low_count: integer"
        ]
      },
      {
        "name": "Finding",
        "fields": [
          "id: string (nanoid, primary key)",
          "scan_id: string (foreign key → Scan.id)",
          "source: string (deterministic | ai | both — which pass detected it)",
          "vulnerability_type: string (e.g., SQL Injection, XSS, Hardcoded Secret)",
          "owasp_category: string (e.g., A03:2021 Injection)",
          "severity: string (critical | high | medium | low)",
          "line_start: integer (1-indexed line number in snippet)",
          "line_end: integer",
          "explanation: text (plain-English 2-sentence description)",
          "fix_snippet: text (corrected code block)",
          "created_at: integer (Unix timestamp ms)"
        ]
      },
      {
        "name": "VulnerabilityAggregate",
        "fields": [
          "vulnerability_type: string (primary key — denormalized for fast leaderboard queries)",
          "total_count: integer (incremented on each scan with this finding)",
          "language_breakdown: text (JSON blob: {python: 12, javascript: 34, ...})",
          "example_snippets: text (JSON array of up to 3 sanitized code examples from seed data)",
          "last_seen_at: integer (Unix timestamp ms)"
        ]
      }
    ]
  },
  "seed_data": "Pre-populate SQLite with 847 historical scan records and corresponding findings to make the leaderboard immediately impressive. Seed script should insert: (1) VulnerabilityAggregate rows for all 10 OWASP-mapped types with realistic counts — SQL Injection: 574 occurrences, Hardcoded Secrets: 347, XSS via innerHTML: 298, Insecure Crypto (MD5/SHA1): 276, Path Traversal: 203, eval() Injection: 187, SSRF: 156, Log Injection: 134, Insecure Random: 121, XXE: 89. Each aggregate row includes a JSON array of 2-3 example vulnerable code snippets (10-15 lines each) that are realistic Copilot-style outputs — e.g., a Python Flask route using f-string SQL, a Node.js Express handler using innerHTML, a PHP file with hardcoded AWS key. (2) 15 realistic Scan records with plausible session_ids, covering all 6 languages, timestamped across the past 30 days, with finding counts that match the aggregates. These 15 scans are what populate the 'Recent Scans' sidebar on first load for any demo session. Language distribution in seed: JavaScript 32%, Python 28%, PHP 18%, TypeScript 12%, Java 6%, Go 4% — matching real-world AI coding assistant usage patterns.",
  "monetization": "Freemium — Free tier: 10 scans/month, 5 saved reports, all 10 vulnerability detectors, shareable links. Pro tier: $29/month — unlimited scans, unlimited saved reports, team report sharing (up to 10 members), priority LLM review (GPT-4o vs GPT-4o-mini on free), CSV/JSON export, Slack webhook on scan complete. Enterprise: $199/month — API access for CI/CD integration, custom OWASP rule packs, SSO, audit log, dedicated support SLA.",
  "pitch": "VulnLens catches the security vulnerabilities that Copilot and Claude ship into your codebase before they reach production — in 8 seconds, with no setup, using an adversarial AI review approach that doesn't fall for the self-correction blind spot every other AI scanner does.",
  "gtm": "Target the DevSecOps and security engineering communities directly: (1) Post a free tool launch on Hacker News 'Show HN' with a live demo pre-loaded with a notorious AI-generated vulnerable snippet (the GPT-4 SQL injection example that went viral in 2023); (2) Share in r/netsec, r/devops, and r/AskNetsec with a post titled 'I built a scanner specifically for AI-generated code after noticing Semgrep misses 78% of Copilot vulnerabilities — free to try'; (3) Create a Twitter/X thread showing side-by-side: same code snippet scanned by Snyk vs VulnLens, with VulnLens catching 3 additional findings; (4) DM the top 50 'security champion' practitioners on LinkedIn who post about DevSecOps with a free Pro trial code; (5) Write a technical blog post 'Why AI code review tools fail to catch AI-generated vulnerabilities' with benchmark data from the seed dataset — optimized for 'AI code security' SEO keywords that have low competition but rising search volume since Q1 2025."
}
```