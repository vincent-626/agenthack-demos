"""
SQLite database setup and operations.
Handles scan storage, report retrieval, history, and seeded leaderboard data.
"""
import sqlite3
import json
import random
import string
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any

DB_PATH = Path(__file__).parent / "vulnlens.db"

SEED_TOTAL = 847

VULN_TYPES = [
    ("SQL Injection", "A03:2021 Injection", "CRITICAL", 68),
    ("Hardcoded Secrets", "A02:2021 Cryptographic Failures", "CRITICAL", 41),
    ("Cross-Site Scripting (XSS)", "A03:2021 Injection", "HIGH", 35),
    ("Insecure Randomness", "A02:2021 Cryptographic Failures", "MEDIUM", 28),
    ("Code Injection via eval()", "A03:2021 Injection", "CRITICAL", 23),
    ("Path Traversal", "A01:2021 Broken Access Control", "HIGH", 19),
    ("Server-Side Request Forgery (SSRF)", "A10:2021 Server-Side Request Forgery", "HIGH", 15),
    ("Weak Cryptography", "A02:2021 Cryptographic Failures", "HIGH", 12),
    ("Log Injection", "A09:2021 Security Logging and Monitoring Failures", "MEDIUM", 9),
    ("XML External Entity (XXE)", "A05:2021 Security Misconfiguration", "HIGH", 7),
]

LANGUAGES = ["python", "javascript", "typescript", "java", "php", "go"]

LANG_AVG_FINDINGS = {
    "php": 6.1,
    "python": 4.8,
    "javascript": 4.2,
    "typescript": 3.8,
    "java": 3.5,
    "go": 2.9,
}

# Example vulnerable code snippets per vulnerability type (for leaderboard drawer)
EXAMPLE_SNIPPETS = {
    "SQL Injection": [
        {
            "language": "python",
            "code": 'def get_user(user_id):\n    query = f"SELECT * FROM users WHERE id = {user_id}"\n    cursor.execute(query)\n    return cursor.fetchone()',
        },
        {
            "language": "javascript",
            "code": 'async function getUser(userId) {\n  const result = await db.query(\n    `SELECT * FROM users WHERE id = ${userId}`\n  );\n  return result.rows[0];\n}',
        },
        {
            "language": "php",
            "code": '<?php\n$id = $_GET["id"];\n$result = mysql_query("SELECT * FROM users WHERE id=\'" . $id . "\'");\n?>',
        },
    ],
    "Hardcoded Secrets": [
        {
            "language": "python",
            "code": 'import jwt\n\nJWT_SECRET = "super-secret-jwt-key-2024"\nANTHROPIC_API_KEY = "sk-ant-1234abcdef5678"\n\ndef create_token(user_id):\n    return jwt.encode({"id": user_id}, JWT_SECRET)',
        },
        {
            "language": "javascript",
            "code": 'const express = require("express");\n\nconst DB_PASSWORD = "admin123!";\nconst API_KEY = "sk-proj-abc123xyz789";\n\nmodule.exports = { DB_PASSWORD, API_KEY };',
        },
    ],
    "Cross-Site Scripting (XSS)": [
        {
            "language": "javascript",
            "code": 'function displayComment(comment) {\n  const div = document.getElementById("comments");\n  div.innerHTML += `<p>${comment}</p>`;\n}',
        },
        {
            "language": "javascript",
            "code": 'app.get("/search", (req, res) => {\n  const query = req.query.q;\n  res.send(`<h1>Results for: ${query}</h1>`);\n});',
        },
    ],
    "Insecure Randomness": [
        {
            "language": "javascript",
            "code": 'function generateSessionToken() {\n  return Math.random().toString(36).substring(2);\n}\n\nfunction generateOTP() {\n  return Math.floor(Math.random() * 900000) + 100000;\n}',
        },
        {
            "language": "python",
            "code": 'import random\n\ndef generate_reset_token():\n    return "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=32))',
        },
    ],
    "Code Injection via eval()": [
        {
            "language": "javascript",
            "code": 'app.post("/calculate", (req, res) => {\n  const formula = req.body.formula;\n  const result = eval(formula);  // user-controlled!\n  res.json({ result });\n});',
        },
        {
            "language": "python",
            "code": 'def process_config(config_str):\n    # Parse user-provided configuration\n    config = eval(config_str)\n    return config',
        },
    ],
    "Path Traversal": [
        {
            "language": "python",
            "code": 'from flask import Flask, request, send_file\nimport os\n\napp = Flask(__name__)\n\n@app.route("/file")\ndef get_file():\n    filename = request.args.get("name")\n    path = os.path.join("/var/app/uploads", filename)\n    return send_file(path)',
        },
        {
            "language": "javascript",
            "code": 'app.get("/download", (req, res) => {\n  const file = req.query.file;\n  const filePath = path.join(__dirname, "files", file);\n  res.sendFile(filePath);\n});',
        },
    ],
    "Server-Side Request Forgery (SSRF)": [
        {
            "language": "python",
            "code": 'import requests\n\n@app.route("/fetch")\ndef fetch_url():\n    url = request.args.get("url")\n    response = requests.get(url)  # no validation!\n    return response.text',
        },
        {
            "language": "javascript",
            "code": 'app.post("/webhook-test", async (req, res) => {\n  const { targetUrl } = req.body;\n  const response = await fetch(targetUrl);\n  const data = await response.json();\n  res.json(data);\n});',
        },
    ],
    "Weak Cryptography": [
        {
            "language": "python",
            "code": 'import hashlib\n\ndef hash_password(password):\n    return hashlib.md5(password.encode()).hexdigest()\n\ndef verify_password(password, hashed):\n    return hash_password(password) == hashed',
        },
        {
            "language": "java",
            "code": 'MessageDigest md = MessageDigest.getInstance("MD5");\nbyte[] hash = md.digest(password.getBytes("UTF-8"));\nString hex = DatatypeConverter.printHexBinary(hash);',
        },
    ],
    "Log Injection": [
        {
            "language": "python",
            "code": 'import logging\n\nlogger = logging.getLogger(__name__)\n\ndef login(username, password):\n    logger.info(f"Login attempt for user: {username}")\n    if authenticate(username, password):\n        logger.info(f"Successful login: {username}")',
        },
        {
            "language": "javascript",
            "code": 'app.post("/login", (req, res) => {\n  const { username } = req.body;\n  console.log(`Login attempt: ${username}`);\n  // ...\n});',
        },
    ],
    "XML External Entity (XXE)": [
        {
            "language": "python",
            "code": 'from xml.etree import ElementTree as ET\n\ndef parse_config(xml_string):\n    tree = ET.fromstring(xml_string)\n    return tree',
        },
        {
            "language": "java",
            "code": 'DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();\nDocumentBuilder builder = factory.newDocumentBuilder();\nDocument doc = builder.parse(new InputSource(new StringReader(userXml)));',
        },
    ],
}


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database schema and seed data."""
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS scans (
                id          TEXT PRIMARY KEY,
                report_id   TEXT UNIQUE,
                user_id     TEXT,
                language    TEXT,
                code        TEXT,
                findings    TEXT,
                severity_summary TEXT,
                created_at  TEXT
            );

            CREATE TABLE IF NOT EXISTS seed_meta (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
        """)
        conn.commit()

        # Check if already seeded
        row = conn.execute("SELECT value FROM seed_meta WHERE key='seeded'").fetchone()
        if not row:
            _seed_data(conn)


def _seed_data(conn: sqlite3.Connection):
    """Populate seed scan data for the leaderboard."""
    random.seed(42)
    base_date = datetime(2024, 6, 1)

    # We store aggregate counts for the leaderboard
    # Build vuln_counts table from VULN_TYPES percentages
    vuln_counts = {}
    for name, owasp, severity, pct in VULN_TYPES:
        count = int(SEED_TOTAL * pct / 100)
        vuln_counts[name] = {
            "owasp": owasp,
            "severity": severity,
            "count": count,
            "pct": pct,
        }

    conn.execute(
        "INSERT OR REPLACE INTO seed_meta VALUES ('vuln_counts', ?)",
        (json.dumps(vuln_counts),)
    )
    conn.execute(
        "INSERT OR REPLACE INTO seed_meta VALUES ('total_scans', ?)",
        (str(SEED_TOTAL),)
    )
    conn.execute(
        "INSERT OR REPLACE INTO seed_meta VALUES ('seeded', '1')"
    )
    conn.commit()


def generate_report_id(length: int = 6) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


def save_scan(
    scan_id: str,
    report_id: str,
    user_id: str,
    language: str,
    code: str,
    findings: List[Dict],
    severity_summary: Dict,
) -> None:
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO scans
               (id, report_id, user_id, language, code, findings, severity_summary, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                scan_id,
                report_id,
                user_id,
                language,
                code,
                json.dumps(findings),
                json.dumps(severity_summary),
                datetime.utcnow().isoformat(),
            ),
        )
        # Increment total scans count
        conn.execute(
            """UPDATE seed_meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)
               WHERE key = 'total_scans'"""
        )
        conn.commit()


def get_scan_by_report_id(report_id: str) -> Optional[Dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM scans WHERE report_id = ?", (report_id,)
        ).fetchone()
        if not row:
            return None
        return _row_to_dict(row)


def get_user_history(user_id: str, limit: int = 5) -> List[Dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_leaderboard() -> Dict:
    with get_conn() as conn:
        row_counts = conn.execute(
            "SELECT value FROM seed_meta WHERE key='vuln_counts'"
        ).fetchone()
        row_total = conn.execute(
            "SELECT value FROM seed_meta WHERE key='total_scans'"
        ).fetchone()

        vuln_counts = json.loads(row_counts["value"]) if row_counts else {}
        total_scans = int(row_total["value"]) if row_total else SEED_TOTAL

        # Also count real scans
        real_rows = conn.execute("SELECT findings FROM scans").fetchall()
        for r in real_rows:
            try:
                findings = json.loads(r["findings"])
                for f in findings:
                    vt = f.get("vulnerability_type")
                    if vt in vuln_counts:
                        vuln_counts[vt]["count"] = vuln_counts[vt]["count"] + 1
            except Exception:
                pass

        return {
            "total_scans": total_scans,
            "avg_findings_per_scan": 4.2,
            "most_dangerous_language": "PHP",
            "vuln_counts": vuln_counts,
            "lang_avg_findings": LANG_AVG_FINDINGS,
            "examples": EXAMPLE_SNIPPETS,
        }


def _row_to_dict(row) -> Dict:
    d = dict(row)
    d["findings"] = json.loads(d["findings"])
    d["severity_summary"] = json.loads(d["severity_summary"])
    return d
