import sqlite3
import json
import uuid
from datetime import datetime, timezone

DB_PATH = "stuckpoint.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS topics (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            problem_statement TEXT NOT NULL,
            concept_tags TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            topic_id TEXT NOT NULL,
            trigger_type TEXT NOT NULL,
            transcript TEXT NOT NULL DEFAULT '[]',
            started_at TEXT NOT NULL,
            ended_at TEXT,
            re_attempted INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (topic_id) REFERENCES topics(id)
        );

        CREATE TABLE IF NOT EXISTS encouragements (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            topic_id TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            shown INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (topic_id) REFERENCES topics(id)
        );
    """)

    # Seed topics if empty
    existing = c.execute("SELECT COUNT(*) FROM topics").fetchone()[0]
    if existing == 0:
        topics = [
            {
                "id": "topic_dp",
                "name": "Dynamic Programming: Longest Common Subsequence",
                "description": "Dynamic programming solves complex problems by breaking them into overlapping subproblems and storing results to avoid redundant computation.",
                "problem_statement": (
                    "Given two strings s1 and s2, find the length of their Longest Common Subsequence (LCS).\n\n"
                    "Example:\n"
                    "  s1 = 'ABCBDAB'\n"
                    "  s2 = 'BDCAB'\n"
                    "  LCS = 'BCAB' → length 4\n\n"
                    "Write a function lcs(s1, s2) that returns the length of the LCS.\n"
                    "Hint: Think about how the problem for lcs(s1[0..i], s2[0..j]) relates to smaller subproblems."
                ),
                "concept_tags": json.dumps(["dynamic programming", "memoization", "recursion", "subproblems", "tabulation"]),
            },
            {
                "id": "topic_trees",
                "name": "Binary Trees: Inorder Traversal",
                "description": "Tree traversal algorithms visit every node in a binary tree in a specific order. Inorder traversal visits left subtree, root, then right subtree.",
                "problem_statement": (
                    "Given the root of a binary tree, return the inorder traversal of its node values.\n\n"
                    "Example:\n"
                    "    1\n"
                    "     \\\n"
                    "      2\n"
                    "     /\n"
                    "    3\n"
                    "Output: [1, 3, 2]\n\n"
                    "Write a function inorder(root) that returns a list of values in inorder.\n"
                    "Hint: Inorder means Left → Root → Right. Think recursively."
                ),
                "concept_tags": json.dumps(["binary tree", "recursion", "traversal", "inorder", "DFS"]),
            },
            {
                "id": "topic_recursion",
                "name": "Recursion: Fibonacci with Memoization",
                "description": "Recursion solves a problem by having a function call itself on smaller inputs. Memoization caches results so you don't recompute the same subproblem.",
                "problem_statement": (
                    "Implement fib(n) that returns the nth Fibonacci number efficiently.\n\n"
                    "Naive recursion is too slow for large n (exponential time).\n"
                    "Use memoization to bring it to O(n).\n\n"
                    "fib(0) = 0\n"
                    "fib(1) = 1\n"
                    "fib(n) = fib(n-1) + fib(n-2)\n\n"
                    "fib(10) = 55, fib(20) = 6765\n\n"
                    "Hint: Use a dictionary/cache to store results you've already computed."
                ),
                "concept_tags": json.dumps(["recursion", "memoization", "fibonacci", "dynamic programming", "caching"]),
            },
        ]
        for t in topics:
            c.execute(
                "INSERT INTO topics (id, name, description, problem_statement, concept_tags) VALUES (?, ?, ?, ?, ?)",
                (t["id"], t["name"], t["description"], t["problem_statement"], t["concept_tags"]),
            )

    conn.commit()
    conn.close()


# ── Student helpers ────────────────────────────────────────────────────────────

def create_student(name: str, email: str) -> dict:
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    conn.execute("INSERT INTO students (id, name, email, created_at) VALUES (?, ?, ?, ?)", (sid, name, email, now))
    conn.commit()
    conn.close()
    return {"id": sid, "name": name, "email": email}


def get_student(student_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Topic helpers ──────────────────────────────────────────────────────────────

def get_all_topics() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM topics").fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["concept_tags"] = json.loads(d["concept_tags"])
        result.append(d)
    return result


def get_topic(topic_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["concept_tags"] = json.loads(d["concept_tags"])
    return d


# ── Session helpers ────────────────────────────────────────────────────────────

def create_session(student_id: str, topic_id: str, trigger_type: str) -> dict:
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (id, student_id, topic_id, trigger_type, transcript, started_at) VALUES (?, ?, ?, ?, ?, ?)",
        (sid, student_id, topic_id, trigger_type, "[]", now),
    )
    conn.commit()
    conn.close()
    return {"id": sid, "student_id": student_id, "topic_id": topic_id, "trigger_type": trigger_type, "transcript": []}


def get_session(session_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["transcript"] = json.loads(d["transcript"])
    return d


def append_to_session(session_id: str, role: str, content: str):
    conn = get_db()
    row = conn.execute("SELECT transcript FROM sessions WHERE id = ?", (session_id,)).fetchone()
    transcript = json.loads(row["transcript"])
    transcript.append({"role": role, "content": content, "timestamp": datetime.now(timezone.utc).isoformat()})
    conn.execute("UPDATE sessions SET transcript = ? WHERE id = ?", (json.dumps(transcript), session_id))
    conn.commit()
    conn.close()


def close_session(session_id: str, re_attempted: bool = False):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    conn.execute(
        "UPDATE sessions SET ended_at = ?, re_attempted = ? WHERE id = ?",
        (now, 1 if re_attempted else 0, session_id),
    )
    conn.commit()
    conn.close()


def get_student_sessions(student_id: str) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT s.*, t.name as topic_name FROM sessions s JOIN topics t ON s.topic_id = t.id WHERE s.student_id = ? ORDER BY s.started_at DESC",
        (student_id,),
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["transcript"] = json.loads(d["transcript"])
        result.append(d)
    return result


def get_prior_session_context(student_id: str, topic_id: str) -> str | None:
    """Return a memory string if student previously struggled with this topic."""
    conn = get_db()
    rows = conn.execute(
        "SELECT transcript, trigger_type FROM sessions WHERE student_id = ? AND topic_id = ? ORDER BY started_at DESC LIMIT 3",
        (student_id, topic_id),
    ).fetchall()
    conn.close()
    if not rows:
        return None
    count = len(rows)
    return f"This student has previously been stuck on this topic {count} time(s). They've shown confusion before — be extra patient and build from fundamentals."


# ── Instructor helpers ─────────────────────────────────────────────────────────

def get_stuck_students_last_24h() -> list[dict]:
    """Return students with stuck events in the last 24 hours, sorted by stuck count desc."""
    conn = get_db()
    rows = conn.execute("""
        SELECT
            st.id as student_id,
            st.name,
            t.name as topic_name,
            t.id as topic_id,
            COUNT(se.id) as stuck_count,
            MAX(se.started_at) as last_stuck_at,
            MAX(se.id) as latest_session_id
        FROM sessions se
        JOIN students st ON se.student_id = st.id
        JOIN topics t ON se.topic_id = t.id
        WHERE se.started_at >= datetime('now', '-24 hours')
        GROUP BY st.id, t.id
        ORDER BY stuck_count DESC
    """).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["urgency"] = "red" if d["stuck_count"] >= 4 else ("yellow" if d["stuck_count"] >= 2 else "green")
        result.append(d)
    return result


def get_session_transcript(session_id: str) -> list[dict]:
    conn = get_db()
    row = conn.execute("SELECT transcript FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return json.loads(row["transcript"]) if row else []


def create_encouragement(student_id: str, topic_id: str, message: str) -> str:
    eid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO encouragements (id, student_id, topic_id, message, created_at) VALUES (?, ?, ?, ?, ?)",
        (eid, student_id, topic_id, message, now),
    )
    conn.commit()
    conn.close()
    return eid


def get_pending_encouragement(student_id: str, topic_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM encouragements WHERE student_id = ? AND topic_id = ? AND shown = 0 ORDER BY created_at DESC LIMIT 1",
        (student_id, topic_id),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def mark_encouragement_shown(encouragement_id: str):
    conn = get_db()
    conn.execute("UPDATE encouragements SET shown = 1 WHERE id = ?", (encouragement_id,))
    conn.commit()
    conn.close()
