# VulnLens — AI Code Security Scanner

**VulnLens** scans AI-generated code snippets for OWASP Top 10 vulnerabilities in seconds, giving DevSecOps engineers and security champions a purpose-built gate between Copilot/Claude output and production.

> Unlike Snyk or Semgrep — designed for human-written code — VulnLens uses a **hybrid two-pass engine**: deterministic regex/AST rules + an adversarial LLM auditor that is explicitly prompted to *distrust* the code it reviews. This directly counters the Self-Correction Blind Spot where AI-on-AI review fails 64.5% of the time.

---

## What Problem It Solves

AI code assistants (GitHub Copilot, Claude, GPT-4) generate plausible-looking code that frequently contains security vulnerabilities — SQL injection via f-strings, hardcoded secrets, insecure randomness — because they optimize for "looks correct" rather than "is secure". Existing SAST tools miss these patterns because they were designed for human-written code.

VulnLens catches these before they hit production, in under 10 seconds, with no setup or login required.

---

## Features

### 1. Instant Paste-and-Scan
- Split-screen: code editor (left) + results panel (right)
- Two-pass analysis:
  - **Pass 1**: Deterministic rule engine — 10 canonical AI-reproduction vulnerability patterns
  - **Pass 2**: Adversarial Claude AI review — explicitly prompted as an external auditor
- Results in under 10 seconds with red gutter markers on vulnerable lines
- One-click "Show Fix" with corrected code snippets
- Copy Report as Markdown for PR comments or Jira tickets

### 2. Vulnerability Trends Leaderboard
- Pre-populated with 847 historical scan records
- Bar chart showing top 10 vulnerability types by frequency
- Language filter (Python, JavaScript, TypeScript, Java, PHP, Go)
- Click any bar to see real example vulnerable code snippets
- Live-updates as new scans complete

### 3. Scan History & Shareable Reports
- Every scan gets a unique shareable URL (`/report/abc123`)
- Recent scans sidebar shows last 5 scans
- Shareable report pages work without login
- Upgrade prompt appears at 5th scan (non-blocking, dismissible)

---

## Detected Vulnerability Types

| Vulnerability | OWASP Category | Severity |
|---|---|---|
| SQL Injection (f-string/template) | A03:2021 Injection | CRITICAL |
| Hardcoded Secrets (API keys, JWT) | A02:2021 Cryptographic Failures | CRITICAL |
| eval() Code Injection | A03:2021 Injection | CRITICAL |
| Cross-Site Scripting (XSS) | A03:2021 Injection | HIGH |
| Path Traversal | A01:2021 Broken Access Control | HIGH |
| SSRF | A10:2021 SSRF | HIGH |
| Weak Cryptography (MD5/SHA1) | A02:2021 Cryptographic Failures | HIGH |
| XML External Entity (XXE) | A05:2021 Security Misconfiguration | HIGH |
| Insecure Randomness | A02:2021 Cryptographic Failures | MEDIUM |
| Log Injection | A09:2021 Logging Failures | MEDIUM |

---

## How to Install and Run

### Prerequisites
- Python 3.9+
- Node.js 18+

### Quick Start

```bash
# 1. Clone / enter the demo directory
cd demo

# 2. Run the start script (installs all deps, builds frontend, starts server)
chmod +x start.sh
./start.sh
```

Then open **http://localhost:8000** in your browser.

### Manual Setup

```bash
# Install Python backend dependencies
pip install -r backend/requirements.txt

# Install and build the React frontend
cd frontend
npm install
npm run build
cd ..

# Start the server
python backend/main.py
```

### Optional: Enable AI Review Pass

The AI adversarial review pass uses Claude. To enable it:

```bash
export ANTHROPIC_API_KEY=your_key_here
python backend/main.py
```

Without the API key, VulnLens still works fully — it shows deterministic results with a notice that AI review was unavailable.

### Development Mode (hot reload)

```bash
# Terminal 1: Backend with auto-reload
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend dev server (proxies /api to backend)
cd frontend && npm run dev
```

Then open **http://localhost:5173**

---

## Feature Walkthrough

### Scanning Code

1. Open http://localhost:8000
2. Paste AI-generated code into the left editor (a vulnerable Python example is pre-loaded)
3. Select the language from the dropdown
4. Click **Scan for Vulnerabilities**
5. Watch the status bar: "Running deterministic checks..." → "Running adversarial AI review..."
6. See findings appear in the right panel — red lines highlight vulnerable code in the editor
7. Click **Show Fix** on any finding to see the corrected code
8. Click **Copy Report as Markdown** to export for a PR comment

### Sharing a Report

After scanning, a toast notification appears: "Report saved — copy shareable link". Click **Copy Link** to get a URL like `http://localhost:8000/report/xK9mP2`. Share this with teammates — they can view the full report without logging in.

### Vulnerability Trends

Click **Vulnerability Trends** in the nav bar to see:
- A bar chart of the 10 most common vulnerability types across all scans
- Stats: total scans, avg findings per scan, most dangerous language
- Language filter to compare vulnerability rates across languages
- Click any bar to see example vulnerable code snippets

---

## Tech Stack

- **Backend**: Python FastAPI + SQLite + Anthropic Claude (optional)
- **Frontend**: React 18 + Vite + CodeMirror 6 + Recharts
- **Database**: SQLite (zero setup, embedded)
- **Security Engine**: Custom regex rule engine (10 patterns) + Claude adversarial prompt
