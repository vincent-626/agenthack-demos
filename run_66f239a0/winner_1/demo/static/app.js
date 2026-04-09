// ── Constants ─────────────────────────────────────────────────────────────────
const STUCK_KEYWORDS = ['idk', "i don't know", "i dont know", 'help', 'what', '???', '??', 'lost', "no idea", "not sure", "confused"];
const INACTIVITY_TIMEOUT_MS = 45000; // 45 seconds
const SHORT_INPUT_THRESHOLD = 5;

// ── State ─────────────────────────────────────────────────────────────────────
let studentId = null;
let currentSessionId = null;
let inactivityTimer = null;
let chatActive = false;
let turnCount = 0;

// ── Utility ───────────────────────────────────────────────────────────────────
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isStuckInput(text) {
  const t = text.trim().toLowerCase();
  if (t.length > 0 && t.length < SHORT_INPUT_THRESHOLD) return true;
  return STUCK_KEYWORDS.some(kw => t.includes(kw));
}

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  return r.json();
}

// ── Onboarding ────────────────────────────────────────────────────────────────
async function ensureStudent(onReady) {
  const stored = localStorage.getItem('sp_student_id');
  if (stored) {
    const student = await api(`/api/students/${stored}`);
    if (!student.error) {
      studentId = stored;
      renderSidebarStudent(student);
      onReady();
      return;
    }
    localStorage.removeItem('sp_student_id');
  }
  showOnboarding(onReady);
}

function showOnboarding(onReady) {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  const form = document.getElementById('onboarding-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('student-name').value.trim();
    const email = document.getElementById('student-email').value.trim();
    if (!name || !email) return;
    const student = await api('/api/students', 'POST', { name, email });
    if (student.error) return;
    localStorage.setItem('sp_student_id', student.id);
    studentId = student.id;
    overlay.classList.add('hidden');
    renderSidebarStudent(student);
    onReady();
  };
}

function renderSidebarStudent(student) {
  const av = document.getElementById('sidebar-avatar');
  const nm = document.getElementById('sidebar-name');
  const em = document.getElementById('sidebar-email');
  if (av) av.textContent = initials(student.name);
  if (nm) nm.textContent = student.name;
  if (em) em.textContent = student.email;
}

// ── Progress Sidebar ──────────────────────────────────────────────────────────
async function loadProgressSidebar(activeTopicId = null) {
  if (!studentId) return;
  const sessions = await api(`/api/students/${studentId}/sessions`);
  const list = document.getElementById('progress-list');
  if (!list) return;

  if (!sessions.length) {
    list.innerHTML = '<div class="empty-state">No sessions yet.<br/>Pick a topic to start!</div>';
    return;
  }

  // Group by topic, show latest
  const byTopic = {};
  sessions.forEach(s => {
    if (!byTopic[s.topic_id]) byTopic[s.topic_id] = { sessions: [], topic_name: s.topic_name };
    byTopic[s.topic_id].sessions.push(s);
  });

  list.innerHTML = '';
  Object.entries(byTopic).forEach(([topicId, { sessions: topicSessions, topic_name }]) => {
    const stuckCount = topicSessions.length;
    const reattempted = topicSessions.some(s => s.re_attempted);
    const latest = topicSessions[0];
    const div = document.createElement('div');
    div.className = 'progress-item' + (topicId === activeTopicId ? ' active' : '');
    div.innerHTML = `
      <div class="progress-topic">${topic_name}</div>
      <div class="progress-meta">
        <span class="stuck-badge">${stuckCount} stuck</span>
        ${reattempted ? '<span class="check-badge">✓ retried</span>' : ''}
        <span>${timeAgo(latest.started_at)}</span>
      </div>
    `;
    div.onclick = () => {
      openSessionReplay(latest.id, topic_name);
    };
    list.appendChild(div);
  });
}

// ── Session Replay ────────────────────────────────────────────────────────────
async function openSessionReplay(sessionId, topicName) {
  const overlay = document.getElementById('replay-overlay');
  const title = document.getElementById('replay-title');
  const container = document.getElementById('replay-transcript');
  if (!overlay) return;
  title.textContent = `Session Replay: ${topicName}`;
  container.innerHTML = '<div class="empty-state">Loading…</div>';
  overlay.classList.remove('hidden');

  const transcript = await api(`/api/sessions/${sessionId}/transcript`);
  renderTranscript(container, transcript);
}

function closeReplay() {
  const overlay = document.getElementById('replay-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function renderTranscript(container, transcript) {
  if (!transcript.length) {
    container.innerHTML = '<div class="empty-state">No messages yet.</div>';
    return;
  }
  container.innerHTML = transcript.map(t => `
    <div class="tr-bubble ${t.role === 'ai' ? 'ai' : 'student'}">
      <div class="tr-label">${t.role === 'ai' ? 'StuckPoint AI' : 'You'}</div>
      ${escapeHtml(t.content)}
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>');
}

function clearHistory() {
  if (!confirm('Clear your entire session history? This cannot be undone.')) return;
  localStorage.removeItem('sp_student_id');
  location.reload();
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
function initHomePage() {
  ensureStudent(() => {
    loadProgressSidebar();
  });
}

// ── TOPIC PAGE ────────────────────────────────────────────────────────────────
function initTopicPage(topicId, topicName) {
  ensureStudent(async () => {
    await loadProgressSidebar(topicId);
    await checkInstructorEncouragement(topicId);
    startInactivityTimer(topicId);
    setupScratchpadListener(topicId);
  });
}

// ── Inactivity Detection ──────────────────────────────────────────────────────
function startInactivityTimer(topicId) {
  resetInactivityTimer(topicId);
}

function resetInactivityTimer(topicId) {
  clearTimeout(inactivityTimer);
  if (chatActive) return;
  let remaining = INACTIVITY_TIMEOUT_MS / 1000;
  const hint = document.getElementById('inactivity-hint');

  inactivityTimer = setTimeout(() => {
    if (!chatActive) {
      if (hint) hint.textContent = '';
      triggerStuckDetection(topicId, 'inactivity');
    }
  }, INACTIVITY_TIMEOUT_MS);

  // Show countdown hint after 20s
  setTimeout(() => {
    if (!chatActive) {
      const countdown = INACTIVITY_TIMEOUT_MS / 1000 - 20;
      if (hint) hint.textContent = `(StuckPoint checks in after ${countdown}s of inactivity)`;
    }
  }, 20000);
}

function setupScratchpadListener(topicId) {
  const scratchpad = document.getElementById('scratchpad');
  if (!scratchpad) return;
  scratchpad.addEventListener('input', () => {
    resetInactivityTimer(topicId);
    if (hint) hint.textContent = '';
  });
  const hint = document.getElementById('inactivity-hint');
}

// ── Stuck Detection & Trigger ─────────────────────────────────────────────────
function checkForStuck() {
  const scratchpad = document.getElementById('scratchpad');
  if (!scratchpad) return;
  const text = scratchpad.value;
  const topicId = window.TOPIC_ID;
  if (!topicId) return;

  if (isStuckInput(text)) {
    triggerStuckDetection(topicId, 'keyword');
  } else {
    // Just acknowledge
    const hint = document.getElementById('inactivity-hint');
    if (hint) hint.textContent = '✓ Looking good! Keep going.';
    setTimeout(() => { if (hint) hint.textContent = ''; }, 3000);
  }
}

async function triggerStuckDetection(topicId, triggerType) {
  if (chatActive) return;
  chatActive = true;
  turnCount = 0;
  clearTimeout(inactivityTimer);

  openChatPanel();
  showTypingIndicator();

  const result = await api('/api/sessions/start', 'POST', {
    student_id: studentId,
    topic_id: topicId,
    trigger_type: triggerType,
  });

  if (result.error) {
    hideChatPanel();
    chatActive = false;
    return;
  }

  currentSessionId = result.session_id;
  removeTypingIndicator();
  appendChatMessage('ai', result.message);
  enableChatInput();
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function openChatPanel() {
  const panel = document.getElementById('chat-panel');
  if (panel) panel.classList.add('open');
  document.getElementById('chat-messages').innerHTML = '';
  document.getElementById('try-again-area').classList.add('hidden');
  document.getElementById('chat-input-area').classList.remove('hidden');
}

function closeChat() {
  if (currentSessionId) {
    api(`/api/sessions/${currentSessionId}/close`, 'POST');
  }
  hideChatPanel();
  chatActive = false;
  currentSessionId = null;
  loadProgressSidebar(window.TOPIC_ID);
  const topicId = window.TOPIC_ID;
  if (topicId) resetInactivityTimer(topicId);
}

function hideChatPanel() {
  const panel = document.getElementById('chat-panel');
  if (panel) panel.classList.remove('open');
}

function appendChatMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  div.innerHTML = escapeHtml(text);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-bubble typing';
  div.id = 'typing-indicator';
  div.textContent = 'StuckPoint is thinking…';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function enableChatInput() {
  const input = document.getElementById('chat-input');
  if (input) { input.disabled = false; input.focus(); }
}

function disableChatInput() {
  const input = document.getElementById('chat-input');
  if (input) input.disabled = true;
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

async function sendChatMessage() {
  if (!currentSessionId) return;
  const input = document.getElementById('chat-input');
  const message = (input.value || '').trim();
  if (!message) return;

  input.value = '';
  appendChatMessage('student', message);
  disableChatInput();
  showTypingIndicator();

  const result = await api(`/api/sessions/${currentSessionId}/message`, 'POST', { message });
  removeTypingIndicator();

  if (result.error) { enableChatInput(); return; }

  appendChatMessage('ai', result.message);
  turnCount = result.turn;

  if (result.offer_retry) {
    document.getElementById('chat-input-area').classList.add('hidden');
    document.getElementById('try-again-area').classList.remove('hidden');
  } else {
    enableChatInput();
  }
}

async function tryAgain() {
  if (currentSessionId) {
    await api(`/api/sessions/${currentSessionId}/retry`, 'POST');
  }
  hideChatPanel();
  chatActive = false;
  currentSessionId = null;

  // Reset scratchpad
  const scratchpad = document.getElementById('scratchpad');
  if (scratchpad) { scratchpad.value = ''; scratchpad.focus(); }

  loadProgressSidebar(window.TOPIC_ID);
  const topicId = window.TOPIC_ID;
  if (topicId) resetInactivityTimer(topicId);
}

// ── Instructor Encouragement ──────────────────────────────────────────────────
async function checkInstructorEncouragement(topicId) {
  if (!studentId || !topicId) return;
  const result = await api(`/api/students/${studentId}/encouragement/${topicId}`);
  if (result.message) {
    const banner = document.getElementById('encouragement-banner');
    const text = document.getElementById('encouragement-text');
    if (banner && text) {
      text.textContent = result.message;
      banner.classList.remove('hidden');
      openChatPanel();
    }
  }
}

// ── INSTRUCTOR PAGE ───────────────────────────────────────────────────────────
let currentEncouragementTarget = null;
let refreshInterval = null;

function initInstructorPage() {
  const form = document.getElementById('login-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const pw = document.getElementById('instructor-password').value;
      const result = await api('/api/instructor/login', 'POST', { password: pw });
      if (result.ok) {
        showDashboard();
      } else {
        document.getElementById('login-error').classList.remove('hidden');
      }
    };
  }
}

async function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  await loadStudentGrid();
  refreshInterval = setInterval(loadStudentGrid, 60000);
}

async function loadStudentGrid() {
  const grid = document.getElementById('students-grid');
  grid.innerHTML = '<div class="loading-state">Loading…</div>';
  const students = await api('/api/instructor/students');

  if (students.error) {
    grid.innerHTML = '<div class="loading-state">Session expired. Please refresh.</div>';
    return;
  }

  if (!students.length) {
    grid.innerHTML = `
      <div class="empty-dashboard">
        <div class="empty-icon">🎉</div>
        <p>No students struggling in the last 24 hours!</p>
      </div>`;
    return;
  }

  grid.innerHTML = '';
  students.forEach(s => {
    const card = document.createElement('div');
    card.className = `student-card urgency-${s.urgency}`;
    card.onclick = () => openStudentDrawer(s);
    card.innerHTML = `
      <div class="card-avatar">${initials(s.name)}</div>
      <div class="card-info">
        <div class="card-name">${escapeHtml(s.name)}</div>
        <div class="card-topic">${escapeHtml(s.topic_name)}</div>
      </div>
      <div class="card-meta">
        <div class="card-stuck">${s.stuck_count}</div>
        <div class="card-stuck-label">stuck today</div>
        <div class="card-timestamp">${timeAgo(s.last_stuck_at)}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Blink refresh indicator
  const ind = document.getElementById('refresh-indicator');
  if (ind) {
    ind.style.opacity = '0.3';
    setTimeout(() => { ind.style.opacity = '1'; }, 300);
  }
}

async function openStudentDrawer(student) {
  currentEncouragementTarget = student;
  document.getElementById('drawer-title').textContent = `${student.name}'s Session`;
  document.getElementById('drawer-subtitle').textContent = `Topic: ${student.topic_name} · ${student.stuck_count} stuck event(s) today`;

  const container = document.getElementById('drawer-transcript');
  container.innerHTML = '<div class="empty-state">Loading transcript…</div>';

  document.getElementById('encourage-status').textContent = '';
  document.getElementById('encourage-btn').disabled = false;

  const drawer = document.getElementById('transcript-drawer');
  const bg = document.getElementById('drawer-overlay');
  drawer.classList.add('open');
  bg.classList.remove('hidden');

  const transcript = await api(`/api/instructor/session/${student.latest_session_id}/transcript`);
  renderTranscript(container, transcript);
}

function closeDrawer() {
  document.getElementById('transcript-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.add('hidden');
  currentEncouragementTarget = null;
}

async function sendEncouragement() {
  if (!currentEncouragementTarget) return;
  const s = currentEncouragementTarget;
  const btn = document.getElementById('encourage-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const result = await api('/api/instructor/encourage', 'POST', {
    student_id: s.student_id,
    topic_id: s.topic_id,
    topic_name: s.topic_name,
    student_name: s.name,
  });

  if (result.ok) {
    document.getElementById('encourage-status').textContent = '✓ Encouragement queued!';
    btn.textContent = '✓ Sent';
  } else {
    btn.disabled = false;
    btn.textContent = '💬 Send Encouragement';
  }
}

function instructorLogout() {
  api('/api/instructor/logout', 'POST').then(() => {
    clearInterval(refreshInterval);
    location.reload();
  });
}
