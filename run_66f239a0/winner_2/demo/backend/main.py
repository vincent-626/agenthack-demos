"""
VulnLens Backend — FastAPI application.
Serves the API and the built React frontend.
"""
import os
import uuid
import json
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import (
    init_db,
    save_scan,
    get_scan_by_report_id,
    get_user_history,
    get_leaderboard,
    generate_report_id,
)
from rules import scan_code

@asynccontextmanager
async def lifespan(app):
    init_db()
    yield

app = FastAPI(title="VulnLens API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# LLM scan (adversarial Claude pass)
# ---------------------------------------------------------------------------

ADVERSARIAL_SYSTEM = """You are an adversarial security auditor. You are reviewing code that was written by an AI assistant (GitHub Copilot, Claude, GPT-4, etc.) and submitted for a security review.

IMPORTANT: You are NOT the author of this code. You did NOT write it. Your job is to find security vulnerabilities the original AI author may have introduced, especially patterns that AI code generators commonly produce.

Review the code for OWASP Top 10 vulnerabilities. For each finding, respond with a JSON array (and nothing else — no markdown, no explanation outside the JSON). Each finding must be an object with these exact fields:
- "vulnerability_type": string — name of the vulnerability
- "owasp_category": string — OWASP category (e.g. "A03:2021 Injection")
- "severity": string — one of "CRITICAL", "HIGH", "MEDIUM", "LOW"
- "line_numbers": array of integers — the approximate line numbers affected
- "description": string — 2 sentences explaining why this is dangerous
- "fix": string — corrected code snippet or approach

If no vulnerabilities are found, return an empty array: []

Be precise. Only report real vulnerabilities with high confidence. Do not report style issues."""


async def llm_scan(code: str, language: str) -> List[Dict[str, Any]]:
    """Run the adversarial LLM pass. Gracefully returns [] on failure."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return []

    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)

        prompt = f"Language: {language}\n\nCode to review:\n```{language}\n{code}\n```"

        message = await asyncio.wait_for(
            client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=2048,
                system=ADVERSARIAL_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            ),
            timeout=20.0,
        )

        text = message.content[0].text.strip()

        # Parse JSON response
        if text.startswith("```"):
            lines = text.split('\n')
            text = '\n'.join(lines[1:-1])

        findings = json.loads(text)
        if not isinstance(findings, list):
            return []

        # Normalize and tag each finding
        result = []
        for f in findings:
            if not isinstance(f, dict):
                continue
            f["source"] = "ai"
            f["id"] = f"ai-{uuid.uuid4().hex[:8]}"
            if "line_numbers" not in f:
                f["line_numbers"] = []
            result.append(f)

        return result

    except asyncio.TimeoutError:
        return []
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def severity_order(s: str) -> int:
    return {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(s.upper(), 4)


def merge_findings(det: List[Dict], ai: List[Dict]) -> List[Dict]:
    """Merge and deduplicate deterministic + AI findings by line number overlap."""
    merged = list(det)
    det_lines = set()
    for f in det:
        for ln in f.get("line_numbers", []):
            det_lines.add(ln)

    for f in ai:
        ai_lines = set(f.get("line_numbers", []))
        # Skip if AI finding overlaps with a deterministic one on same lines
        if ai_lines and ai_lines & det_lines:
            continue
        merged.append(f)

    merged.sort(key=lambda f: severity_order(f.get("severity", "LOW")))
    return merged


def build_severity_summary(findings: List[Dict]) -> Dict:
    summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        s = f.get("severity", "").upper()
        if s in summary:
            summary[s] += 1
    return summary


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ScanRequest(BaseModel):
    code: str
    language: str
    user_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/scan")
async def scan(req: ScanRequest):
    if len(req.code.strip()) == 0:
        raise HTTPException(status_code=400, detail="Code snippet is empty")

    scan_id = str(uuid.uuid4())
    report_id = generate_report_id()

    # Pass 1: deterministic (fast, synchronous)
    det_findings = scan_code(req.code, req.language)

    # Pass 2: LLM (adversarial, async)
    ai_findings = await llm_scan(req.code, req.language)
    ai_available = bool(os.environ.get("ANTHROPIC_API_KEY"))

    # Merge
    all_findings = merge_findings(det_findings, ai_findings)
    severity_summary = build_severity_summary(all_findings)

    # Persist
    save_scan(
        scan_id=scan_id,
        report_id=report_id,
        user_id=req.user_id,
        language=req.language,
        code=req.code,
        findings=all_findings,
        severity_summary=severity_summary,
    )

    return {
        "scan_id": scan_id,
        "report_id": report_id,
        "findings": all_findings,
        "severity_summary": severity_summary,
        "ai_pass_available": ai_available,
    }


@app.get("/api/report/{report_id}")
async def get_report(report_id: str):
    scan = get_scan_by_report_id(report_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Report not found")
    return scan


@app.get("/api/history")
async def history(user_id: str):
    scans = get_user_history(user_id, limit=5)
    # Return lightweight cards (no full code)
    cards = []
    for s in scans:
        cards.append({
            "scan_id": s["id"],
            "report_id": s["report_id"],
            "language": s["language"],
            "snippet_preview": s["code"][:60].replace('\n', ' '),
            "severity_summary": s["severity_summary"],
            "created_at": s["created_at"],
        })
    return cards


@app.get("/api/leaderboard")
async def leaderboard():
    return get_leaderboard()


# ---------------------------------------------------------------------------
# Serve React frontend (built)
# ---------------------------------------------------------------------------

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
else:
    @app.get("/")
    async def root():
        return {"message": "VulnLens API running. Build the frontend with: cd frontend && npm install && npm run build"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"\n✅ VulnLens running at http://localhost:{port}\n")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
