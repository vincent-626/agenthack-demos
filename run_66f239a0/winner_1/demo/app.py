import json
import os
from flask import Flask, request, jsonify, render_template, session, abort

import anthropic
import database as db

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "stuckpoint-dev-secret-2024")

INSTRUCTOR_PASSWORD = "instructor2024"

# Anthropic client (lazy-init so missing key doesn't crash import)
_anthropic_client = None


def get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    return _anthropic_client


# ── AI helpers ─────────────────────────────────────────────────────────────────

def build_system_prompt(topic: dict, prior_context: str | None) -> str:
    tags = ", ".join(topic["concept_tags"])
    base = f"""You are StuckPoint, a warm and patient AI tutor using the Socratic method.

Topic: {topic["name"]}
Key concepts: {tags}

Your role is to guide students through confusion WITHOUT giving away answers directly.
Follow this 3-step Socratic ladder:
1. Anchor to prior knowledge — ask what they already know or associate with the concept
2. Identify the specific gap — ask a focused diagnostic question
3. Give ONE concrete micro-explanation (≤3 sentences + 1 small example)

Rules:
- Keep every response under 4 sentences
- Always end with a question or a clear next step
- Be warm, specific, and encouraging — never condescending
- Do NOT give the full solution; guide toward the insight
- Reference the topic name and concept tags to make questions specific"""

    if prior_context:
        base += f"\n\nMemory context: {prior_context}"

    return base


def generate_opening_message(topic: dict, trigger_type: str, prior_context: str | None) -> str:
    system = build_system_prompt(topic, prior_context)
    trigger_note = {
        "inactivity": "The student has been idle for 45 seconds without typing.",
        "keyword": "The student typed a confused/stuck message.",
    }.get(trigger_type, "The student appears stuck.")

    user_msg = (
        f"{trigger_note} Generate a warm, specific opening message that:\n"
        f"1. Acknowledges they might be stuck (without being condescending)\n"
        f"2. Asks ONE anchor question tied specifically to '{topic['name']}'\n"
        f"Keep it under 3 sentences."
    )

    client = get_anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return resp.content[0].text.strip()


def generate_tutor_response(topic: dict, transcript: list[dict], prior_context: str | None) -> str:
    system = build_system_prompt(topic, prior_context)
    # Convert transcript to Anthropic message format
    messages = []
    for turn in transcript:
        role = "assistant" if turn["role"] == "ai" else "user"
        messages.append({"role": role, "content": turn["content"]})

    client = get_anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=system,
        messages=messages,
    )
    return resp.content[0].text.strip()


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    topics = db.get_all_topics()
    return render_template("index.html", topics=topics)


@app.route("/topic/<topic_id>")
def topic_page(topic_id):
    topic = db.get_topic(topic_id)
    if not topic:
        abort(404)
    return render_template("topic.html", topic=topic)


@app.route("/instructor")
def instructor_page():
    return render_template("instructor.html")


# ── API: Students ──────────────────────────────────────────────────────────────

@app.route("/api/students", methods=["POST"])
def api_create_student():
    data = request.json
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    if not name or not email:
        return jsonify({"error": "name and email required"}), 400
    student = db.create_student(name, email)
    return jsonify(student)


@app.route("/api/students/<student_id>")
def api_get_student(student_id):
    student = db.get_student(student_id)
    if not student:
        return jsonify({"error": "not found"}), 404
    return jsonify(student)


@app.route("/api/students/<student_id>/sessions")
def api_student_sessions(student_id):
    sessions = db.get_student_sessions(student_id)
    return jsonify(sessions)


@app.route("/api/students/<student_id>/encouragement/<topic_id>")
def api_get_encouragement(student_id, topic_id):
    enc = db.get_pending_encouragement(student_id, topic_id)
    if enc:
        db.mark_encouragement_shown(enc["id"])
        return jsonify({"message": enc["message"]})
    return jsonify({"message": None})


# ── API: Sessions ──────────────────────────────────────────────────────────────

@app.route("/api/sessions/start", methods=["POST"])
def api_start_session():
    data = request.json
    student_id = data.get("student_id")
    topic_id = data.get("topic_id")
    trigger_type = data.get("trigger_type", "inactivity")

    student = db.get_student(student_id)
    topic = db.get_topic(topic_id)
    if not student or not topic:
        return jsonify({"error": "invalid student or topic"}), 400

    prior_context = db.get_prior_session_context(student_id, topic_id)
    sess = db.create_session(student_id, topic_id, trigger_type)

    opening = generate_opening_message(topic, trigger_type, prior_context)
    db.append_to_session(sess["id"], "ai", opening)

    return jsonify({"session_id": sess["id"], "message": opening})


@app.route("/api/sessions/<session_id>/message", methods=["POST"])
def api_send_message(session_id):
    data = request.json
    student_message = (data.get("message") or "").strip()
    if not student_message:
        return jsonify({"error": "message required"}), 400

    sess = db.get_session(session_id)
    if not sess:
        return jsonify({"error": "session not found"}), 404

    topic = db.get_topic(sess["topic_id"])
    prior_context = db.get_prior_session_context(sess["student_id"], sess["topic_id"])

    # Save student message
    db.append_to_session(session_id, "student", student_message)

    # Reload transcript with new student message
    sess = db.get_session(session_id)
    turn_count = len([t for t in sess["transcript"] if t["role"] == "student"])

    # Generate AI response
    ai_reply = generate_tutor_response(topic, sess["transcript"], prior_context)
    db.append_to_session(session_id, "ai", ai_reply)

    # After 3 student turns, offer "Try Again"
    offer_retry = turn_count >= 3

    return jsonify({
        "message": ai_reply,
        "turn": turn_count,
        "offer_retry": offer_retry,
    })


@app.route("/api/sessions/<session_id>/retry", methods=["POST"])
def api_retry(session_id):
    db.close_session(session_id, re_attempted=True)
    return jsonify({"ok": True})


@app.route("/api/sessions/<session_id>/close", methods=["POST"])
def api_close_session(session_id):
    db.close_session(session_id, re_attempted=False)
    return jsonify({"ok": True})


@app.route("/api/sessions/<session_id>/transcript")
def api_session_transcript(session_id):
    transcript = db.get_session_transcript(session_id)
    return jsonify(transcript)


# ── API: Instructor ────────────────────────────────────────────────────────────

@app.route("/api/instructor/login", methods=["POST"])
def api_instructor_login():
    data = request.json
    if data.get("password") == INSTRUCTOR_PASSWORD:
        session["instructor"] = True
        return jsonify({"ok": True})
    return jsonify({"error": "wrong password"}), 401


@app.route("/api/instructor/logout", methods=["POST"])
def api_instructor_logout():
    session.pop("instructor", None)
    return jsonify({"ok": True})


@app.route("/api/instructor/students")
def api_instructor_students():
    if not session.get("instructor"):
        return jsonify({"error": "unauthorized"}), 401
    students = db.get_stuck_students_last_24h()
    return jsonify(students)


@app.route("/api/instructor/session/<session_id>/transcript")
def api_instructor_transcript(session_id):
    if not session.get("instructor"):
        return jsonify({"error": "unauthorized"}), 401
    transcript = db.get_session_transcript(session_id)
    return jsonify(transcript)


@app.route("/api/instructor/encourage", methods=["POST"])
def api_instructor_encourage():
    if not session.get("instructor"):
        return jsonify({"error": "unauthorized"}), 401
    data = request.json
    student_id = data.get("student_id")
    topic_id = data.get("topic_id")
    topic_name = data.get("topic_name", "this topic")
    student_name = data.get("student_name", "there")

    message = (
        f"Your instructor noticed you working hard on {topic_name}. "
        f"Keep going, {student_name} — you're making real progress! "
        "Every struggle is a step toward mastery."
    )
    db.create_encouragement(student_id, topic_id, message)
    return jsonify({"ok": True, "message": message})


if __name__ == "__main__":
    db.init_db()
    app.run(debug=True, port=5000)
