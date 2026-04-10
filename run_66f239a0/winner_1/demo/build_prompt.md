Build a working demo application based on the following product spec and market research.

## Product Spec

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
   

## Market Research

I'll conduct comprehensive market research on this problem. Let me run multiple searches simultaneously to gather data efficiently.
Excellent — I now have comprehensive data across all research dimensions. Let me compile this into the full JSON report.

---

## Deep Market Research: AI-Generated Code Security Vulnerabilities

Here is the synthesized research with citations, followed by the full JSON output.

---

### 📊 Market Size


The application security market was valued at over $14.12 billion in 2025 and is anticipated to cross $43.08 billion by 2035, growing at more than 11.8% CAGR.
 The specific AI code security sub-segment rides a steeper slope: 
the AI code generation market was valued at $4.91 billion in 2024 and is projected to reach $30.1 billion by 2032 at a 27.1% CAGR.
 The SAST software market alone is significant: 
the Global SAST Software Market size is projected at $2.8 billion for 2026 and anticipated to hit $6.27 billion by 2035, expanding at a CAGR of 24.05%.


---

### 🏆 Competitor Snapshots

**Snyk:** 
Snyk pricing can range from anywhere between $5,000 to $70,000 depending on your needs.
 The Team plan sits at 
$25 per contributing developer per month, meaning a team of 10 pays $3,000 per year.
 Key weakness: 
"enterprise pricing can be cost-prohibitive for larger teams or startups scanning many repositories or containers."
 Also, 
the SAST component is very weak and doesn't support incremental scanning.


**Semgrep:** 
At $40 per contributor per month with transparent pricing, Semgrep offers unusual cost predictability in an enterprise SAST market where most vendors require sales engagement for quotes.
 A key emerging weakness is multi-tool coverage: 
78.3% of confirmed AI-introduced vulnerabilities were flagged by only one out of five SAST tools tested, meaning if you rely on a single scanner, you are missing most AI-introduced vulnerabilities.


**Veracode:** 
Veracode is the established enterprise SAST vendor with deep compliance credentials and extensive language coverage. However, Veracode's SAST analysis is thorough but slow, often taking hours for large codebases.
 
Its licensing model, slower feedback cycles, and portal-first workflows have led many teams to evaluate alternatives that align better with current DevSecOps practices.


**GitHub Advanced Security:** 
GHAS shifted to two distinct standalone products in April 2025: GitHub Secret Protection and GitHub Code Security, replacing the previous all-or-nothing GHAS bundle. Both products are priced on an active committer model, not by seat count.
 Key gaps: 
the product lacks native dynamic or runtime testing found in some competing suites, so overall risk coverage is strong but not complete.
 User complaints: 
it lacks a centralized dashboard for viewing reports across all projects; deployment is complex and support for more programming languages is needed.


**SonarQube:** 
SonarQube does not natively scan open-source dependency vulnerabilities — this is a blind spot in SonarQube's coverage, and teams often need a separate SCA tool to cover open-source risks.
 
While it catches basic issues like hardcoded passwords or deprecated APIs, it lacks the depth to identify more complex security vulnerabilities.


---

### 👤 Target Persona & Current Workflow


For organisations with AppSec-to-developer ratios of 1:50 or even 1:200, these issues enter production pipelines faster than security teams can manually review or triage them.
 The core persona is the "security champion" or DevSecOps engineer inside a mid-market startup who bears responsibility without proper tooling. 
You're shipping risk blind. False positives slow everything down, false negatives walk into prod, and nobody has time to dig through 400 low-confidence findings that don't map to real-world exploits.


---

### ⏱️ Timing Signals


By June 2025, AI-generated code was introducing over 10,000 new security findings per month — a 10× spike in just six months compared to December 2024

## Instructions

1. Scaffold the project based on the demo_format specified in the spec
2. Implement all MVP features from the spec, following the user flows exactly
3. Include the seed/mock data described so the demo is immediately impressive when launched
4. Add a README.md with:
   - What the product does and what problem it solves
   - How to install and run it (step-by-step)
   - A walkthrough of key features
5. Make sure the application actually runs without errors

Use ONLY common, well-supported libraries. Keep the code clean and straightforward.
The demo should be production-quality in UX but MVP in scope.

IMPORTANT: The demo MUST work when run. Test your implementation.