# StuckPoint

**Proactive AI tutoring that comes to you — before you get too stuck.**

Most AI tutors wait for students to ask good questions. StuckPoint flips this: it monitors inactivity and confusion signals, then *takes the first move* — initiating a structured Socratic dialogue, tracking history across sessions, and surfacing a live instructor alert dashboard.

---

## What problem it solves

Students who are deeply confused are also the least able to ask for help. They stare at the screen, type "idk", or give up silently. Existing tools (Khanmigo, Socratic, ChatGPT) all require students to self-initiate — exactly the behavior confused students struggle with most. StuckPoint detects the struggle and starts the conversation automatically.

---

## How to install and run

### Prerequisites

- Python 3.10+
- An Anthropic API key (`ANTHROPIC_API_KEY`)

### Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your API key
export ANTHROPIC_API_KEY=your_key_here

# 3. Run the app
python app.py
```

The app starts at **http://localhost:5000**

The SQLite database (`stuckpoint.db`) is created automatically with 3 pre-seeded topics on first run.

---

## Key features walkthrough

### 1. Student onboarding & persistent profile

On first visit, a modal prompts for name and email. A UUID is generated and stored in `localStorage` — no password required. Every return visit auto-recognizes the student.

### 2. Topic workspace with proactive stuck detection

- Student picks a topic (e.g. *Dynamic Programming: LCS*) and sees the problem statement + a freeform scratchpad
- **Two detection modes run simultaneously:**
  - **Inactivity:** after 45 seconds without typing, the chat panel slides open automatically
  - **Keyword:** typing "idk", "help", "???", or short inputs (<5 chars) triggers the same flow when the student clicks *Submit / Check In*
- The AI sends the **first message** — topic-specific, warm, diagnostic — with zero clicks from the student

### 3. 3-turn Socratic dialogue

The AI follows a structured ladder:
1. Anchor to prior knowledge
2. Identify the specific gap
3. Give one concrete micro-explanation (≤3 sentences + example)

After 3 student turns, a **"Try the Problem Again"** button appears. Clicking it marks the session as re-attempted and resets the scratchpad.

### 4. Cross-session memory

- The left sidebar shows every topic visited, stuck count, and whether the student successfully re-attempted
- Clicking any session entry shows a full **conversation replay**
- When a student revisits a topic they previously struggled with, the AI system prompt includes memory context: *"This student has been stuck on this topic N times — be extra patient"*

### 5. Instructor dashboard (`/instructor`)

- Password: **`instructor2024`**
- Shows all students with stuck events in the last 24 hours, sorted by stuck count
- Color-coded urgency: green (1 stuck), yellow (2–3), red (4+)
- Click any student card to read the full session transcript
- **Send Encouragement** button queues a personalized message that appears in the student's chat panel next time they open that topic
- Auto-refreshes every 60 seconds

---

## Architecture

```
app.py          Flask backend (routes + AI integration)
database.py     SQLite schema, seed data, all DB helpers
templates/
  index.html    Home page (topic picker + progress sidebar)
  topic.html    Topic workspace + live chat panel
  instructor.html  Instructor dashboard
static/
  style.css     Full UI design system
  app.js        Client-side logic (stuck detection, chat, instructor)
stuckpoint.db   Auto-created SQLite database
```

**Tech stack:** Flask · SQLite · Anthropic Claude (`claude-sonnet-4-6`) · Vanilla JS

---

## Pre-seeded topics

1. **Dynamic Programming: Longest Common Subsequence** — DP, memoization, tabulation
2. **Binary Trees: Inorder Traversal** — recursion, DFS, tree traversal
3. **Recursion: Fibonacci with Memoization** — recursion, caching, bottom-up vs top-down
