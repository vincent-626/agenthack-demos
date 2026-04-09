```json
{
  "problem_id": "prob_011",
  "product_name": "StuckPoint",
  "value_prop": "StuckPoint proactively detects when a student is stuck on a concept and launches a guided, diagnostic tutoring conversation — no prompt-crafting required — while alerting instructors in real time.",
  "differentiator": "Unlike every existing AI tutor (Khanmigo, Socratic, ChatGPT) which waits for students to ask good questions, StuckPoint monitors inactivity and confusion signals, then takes the first move: it initiates a structured Socratic dialogue, tracks session history across visits, and surfaces a live instructor alert dashboard — turning passive AI into a proactive learning coach.",
  "mvp_features": [
    {
      "name": "Proactive Stuck Detection & Auto-Initiated Dialogue",
      "description": "The student is given a topic/problem to work on (e.g., 'Dynamic Programming: Longest Common Subsequence'). A lightweight inactivity + frustration detector monitors: (1) time spent on screen without typing (>45 seconds), (2) short low-confidence inputs like 'idk', 'i dont understand', 'help', '???', or blank submissions. When triggered, StuckPoint does NOT wait — it sends the first message: a warm, specific diagnostic opener tied to the current topic (e.g., 'Hey, it looks like you might be stuck. Let me help. First — when you hear the phrase dynamic programming, what word or idea comes to mind first? Even a guess is great.'). The conversation then follows a 3-step Socratic ladder: (1) anchor to prior knowledge, (2) identify the specific gap, (3) give one concrete micro-explanation. All conversation is driven by the AI — the student only needs to respond freely.",
      "user_flow": [
        "Step 1: Student lands on a topic page (e.g., 'Dynamic Programming') showing a problem statement and a freeform scratchpad text area",
        "Step 2: Student reads, attempts to type, or simply sits idle for 45 seconds without meaningful input",
        "Step 3: System detects inactivity threshold OR parses a low-confidence/stuck keyword in the scratchpad",
        "Step 4: A chat panel slides in from the right with an AI-initiated message — no student action required",
        "Step 5: AI asks a targeted diagnostic question based on the current topic (pulled from topic metadata + GPT-4o prompt)",
        "Step 6: Student types any free-form response (even 'i have no idea')",
        "Step 7: AI responds with the next Socratic prompt or a focused micro-explanation (≤3 sentences + 1 example)",
        "Step 8: After 3 exchanges, AI offers a 'Try the problem again' CTA, closing the chat panel and resetting the scratchpad",
        "Step 9: Session is saved to DB with timestamp, topic, stuck trigger type, and conversation transcript"
      ],
      "acceptance_criteria": [
        "It should automatically open the chat panel and send the first AI message within 2 seconds of detecting a stuck signal — with zero clicks from the student",
        "It should detect stuck signals from: 45s inactivity, inputs containing 'idk', 'i don't know', 'help', 'what', '???', or inputs under 5 characters",
        "It should generate a topic-specific opening question (not a generic one) using the topic name and concept tags stored in the DB",
        "It should complete a full 3-turn Socratic dialogue and then present a 'Try Again' button",
        "It should persist the full conversation transcript, topic ID, trigger type, and UTC timestamp to the sessions table in SQLite",
        "It should work for at least 3 pre-seeded topics without any additional configuration"
      ]
    },
    {
      "name": "Cross-Session Learning Memory & Progress Trail",
      "description": "Every time a student interacts with StuckPoint, the session is tied to a persistent student profile (name + email, no auth complexity — just a localStorage UUID linked to a DB record). A 'My Progress' sidebar shows the student a simple timeline: which topics they've visited, how many times they got stuck, and whether they successfully re-attempted the problem after a tutoring session. This gives students a sense of growth ('Last week I was stuck on recursion 3 times; now I get it') and gives the system enough memory to personalize future sessions ('I see you struggled with memoization last time — let's revisit that before we go further').",
      "user_flow": [
        "Step 1: On first visit, student enters their name and email into a minimal onboarding modal (no password); a UUID is generated and stored in localStorage + DB",
        "Step 2: Every subsequent visit auto-recognizes the student via localStorage UUID",
        "Step 3: Student sees a left sidebar with their topic history: topic name, date, stuck count (badge), and a green checkmark if they re-attempted after tutoring",
        "Step 4: Student clicks a past topic entry to see a compressed replay of that session's conversation",
        "Step 5: When a new stuck session begins, the AI prompt includes a memory injection: the system checks if this topic was previously struggled with and adds context to the GPT prompt (e.g., 'This student previously struggled with memoization in this topic')",
        "Step 6: Student can click 'Clear my history' to reset their profile"
      ],
      "acceptance_criteria": [
        "It should create a student record on first visit and persist UUID to localStorage so returning visits are auto-recognized without login",
        "It should display a sidebar timeline showing all topics visited, with stuck count and re-attempt status for each",
        "It should inject prior session context into the GPT system prompt when a student revisits a topic they previously struggled with",
        "It should mark a session as 're-attempted' when the student clicks the 'Try Again' CTA after a tutoring dialogue",
        "It should allow a student to view the conversation transcript from any past session by clicking it in the sidebar"
      ]
    },
    {
      "name": "Instructor Alert Dashboard",
      "description": "A separate, password-protected instructor view (single hardcoded password for MVP: 'instructor2024') shows a live feed of student struggle events. Each card displays: student name, topic, how many times they've been stuck today, and a color-coded urgency level (green = 1 stuck event, yellow = 2-3, red = 4+). Instructors can click a student card to read the full conversation transcript. There is a one-click 'Send Encouragement' button that queues a simple pre-written nudge message that appears in the student's chat panel next time they open the topic. This gives instructors actionable signal without requiring them to monitor every chat in real time.",
      "user_flow": [
        "Step 1: Instructor navigates to /instructor and enters password 'instructor2024'",
        "Step 2: Dashboard loads showing all students who have had at least one stuck event in the last 24 hours, sorted by stuck count descending",
        "Step 3: Each student card shows: avatar initials, name, current topic, stuck count today, urgency color badge, and last-stuck timestamp",
        "Step 4: Instructor clicks a student card to expand a drawer showing the full conversation transcript from the most recent session",
        "Step 5: Instructor clicks 'Send Encouragement' — a pre-written message (e.g., 'Your instructor noticed you working hard on [topic]. Keep going — you're making progress!') is stored in DB flagged for that student",
        "Step 6: Next time that student opens their topic page, the encouragement message appears at the top of the chat panel as a special instructor note card",
        "Step 7: Dashboard auto-refreshes every 60 seconds (polling, no websockets needed for MVP)"
      ],
      "acceptance_criteria": [
        "It should require password entry ('instructor2024') before showing any student data",
        "It should display all students with stuck events in the last 24 hours, sorted by stuck count descending",
        "It should color-code urgency: green for 1 event, yellow for 2-3 events, red for 4+ events",
        "It should allow the instructor to expand any student card and read their full conversation transcript",
        "It should persist an encouragement message to the DB when the instructor clicks 'Send Encouragement', linked to that student ID",
        "It should display the encouragement message to the student on their next topic page load, above the chat panel",
        "It should auto-refresh the dashboard data every 60 seconds without a full page reload"
      ]
    }
  ],
  "out_of_scope": [
    "Real authentication / OAuth / JWT (post-MVP — use localStorage UUID + single instructor password)",
    "LMS integrations (Google Classroom, Canvas, Blackboard) — v2",
    "Student-uploaded homework or photo/OCR input — v2",
    "Voice input or text-to-speech — v2",
    "Multi-instructor / role management — v2",
    "Adaptive curriculum sequencing (auto-assigning next topic based on mastery) — v3",
    "Mobile app or PWA — post-MVP",
    "Real-time websocket push (use 60s polling for MVP)",
    "Payment / subscription billing — post-MVP",
    "Custom topic creation by instructors — v2 (MVP uses seeded topics only)"
  ],
  "demo_format": "web_app",
  "tech_stack": {
    "frontend": "Next.js 14 (App Router) + Tailwind CSS + shadcn/ui components",
    "backend": "Next.js API routes (Edge-compatible Node.js handlers)",
    "database": "SQLite with better-sqlite3 (file-based, zero config, ships with repo)",
    "key_libraries": [
      "openai (official Node SDK, GPT-4o API calls)",
      "better-sqlite3 (synchronous SQLite, simple schema management)",
      "shadcn/ui (Card, Badge, Drawer, Dialog, Button, Textarea components)",
      "lucide-react (icons: AlertTriangle, CheckCircle, Clock, MessageSquare)",
      "uuid (client-side UUID generation for student identity)",
      "clsx + tailwind-merge (conditional classNames)",
      "date-fns (timestamp formatting in dashboard and sidebar)"
    ]
  },
  "data_model": {
    "entities": [
      {
        "name": "Topic",
        "fields": [
          "id: string (UUID, primary key)",
          "title: string (e.g., 'Dynamic Programming: Longest Common Subsequence')",
          "subject: string (e.g., 'Computer Science', 'Calculus', 'Algebra')",
          "difficulty: string (enum: 'beginner' | 'intermediate' | 'advanced')",
          "concept_tags: string (comma-separated, e.g., 'memoization,recursion,subproblems')",
          "problem_statement: string (the problem shown to the student on the topic page)",
          "anchor_question: string (the AI's opening Socratic question when stuck is detected, topic-specific)",
          "created_at: timestamp"
        ]
      },
      {
        "name": "Student",
        "fields": [
          "id: string (UUID, primary key — also stored in localStorage)",
          "name: string",
          "email: string",
          "created_at: timestamp"
        ]
      },
      {
        "name": "Session",
        "fields": [
          "id: string (UUID, primary key)",
          "student_id: string (foreign key → Student.id)",
          "topic_id: string (foreign key → Topic.id)",
          "trigger_type: string (enum: 'inactivity' | 'keyword' | 'manual')",
          "stuck_count: integer (how many stuck events occurred in this session)",
          "re_attempted: boolean (did student click 'Try Again' after tutoring)",
          "conversation: string (JSON array of {role: 'ai'|'student', content: string, timestamp})",
          "created_at: timestamp",
          "updated_at: timestamp"
        ]
      },
      {
        "name": "InstructorMessage",
        "fields": [
          "id: string (UUID, primary key)",
          "student_id: string (foreign key → Student.id)",
          "topic_id: string (foreign key → Topic.id)",
          "message: string (pre-written encouragement text, instructor can optionally edit)",
          "delivered: boolean (false until student sees it)",
          "created_at: timestamp"
        ]
      }
    ]
  },
  "seed_data": "Pre-seed 5 topics to make the demo immediately impressive without any setup: (1) 'Dynamic Programming: Longest Common Subsequence' [CS, advanced] with problem: 'Given two strings s1=\"ABCBDAB\" and s2=\"BDCABA\", find the length of their longest common subsequence. Show your approach.' anchor_question: 'When you hear dynamic programming, what word or idea comes to mind first — even a total guess is fine.'; (2) 'Calculus: Related Rates' [Math, intermediate] with problem: 'A ladder 10ft long rests against a wall. The base slides away at 2ft/s. How fast is the top sliding down when the base is 6ft from the wall?' anchor_question: 'Before we touch the math — what do you think the phrase related rates is trying to describe in plain English?'; (3) 'Recursion: Tower of Hanoi' [CS, intermediate] with problem: 'Write a recursive function to solve Tower of Hanoi for n=3 disks. Explain what your base case is and why.' anchor_question: 'Have you written a recursive function before — even a simple one like factorial? Tell me what you remember about how it worked.'; (4) 'Algebra: Quadratic Formula' [Math, beginner] with problem: 'Solve: 2x² + 5x - 3 = 0. Show all steps using the quadratic formula.' anchor_question: 'What part of this problem feels most unfamiliar right now — the formula itself, or knowing when to use it?'; (5) 'Statistics: Central Limit Theorem' [Statistics, advanced] with problem: 'Explain in your own words why the Central Limit Theorem matters and apply it: a population has mean=50, SD=10. What is the sampling distribution of the mean for n=100?' anchor_question: 'If I asked you what a sampling distribution is — separate from a regular distribution — what would you say? No wrong answers.'. Additionally pre-seed 3 Student records (Alice Chen, Bob Martinez, Sarah Kim) with realistic Session records showing: Alice stuck 4 times on Dynamic Programming (red urgency), Bob stuck 2 times on Calculus (yellow), Sarah stuck 1 time on Recursion (green). Each session has a realistic 3-turn conversation transcript stored as JSON. One InstructorMessage pre-seeded for Alice, delivered=false, so the demo shows the full encouragement flow.",
  "monetization": "Freemium — students get 3 topic sessions/month free; $12/month per student for unlimited sessions + full progress history. Instructor dashboard free for up to 5 students; $49/month per instructor for unlimited students + CSV export + email digest. Target initial deal: sell to bootcamps and community colleges as a cohort license at $299/month for up to 30 students.",
  "pitch": "StuckPoint is the first AI tutor that reaches out to students when they're stuck — not the other way around — while giving instructors a live dashboard to catch struggling learners before they drop out.",
  "gtm": "Target CS bootcamp instructors and community college professors first — they have the most acute pain (high student-to-instructor ratios, diverse preparation levels, dropout risk) and the fastest purchase cycles. Post a demo video on Twitter/X and LinkedIn showing the stuck-detection triggering in real time and the instructor alert appearing — this is visually striking and shareable. DM 50 bootcamp instructors on LinkedIn directly with a 60-second Loom demo. Offer the first 10 instructors a free 30-day cohort trial in exchange for a testimonial and feedback call. Post in r/learnprogramming and r/cscareerquestions as a student-facing tool to drive bottom-up adoption. First 100 users = 70 students from Reddit/social + 30 instructors from direct outreach."
}
```