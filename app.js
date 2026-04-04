/* ============================================================
   SystemDesign.Pro — Application Logic v2.0 (FAANG Edition)
   ============================================================ */

// ── State ──────────────────────────────────────────────────
const state = {
  currentView: 'home',
  currentQuestion: null,
  currentTab: 'overview',
  filterDiff: 'all',
  filterTopic: 'all',
  completed: JSON.parse(localStorage.getItem('sd_completed') || '[]'),
  bookmarks: JSON.parse(localStorage.getItem('sd_bookmarks') || '[]'),
  streak: parseInt(localStorage.getItem('sd_streak') || '0'),
  lastDate: localStorage.getItem('sd_lastDate') || ''
};

function save() {
  localStorage.setItem('sd_completed', JSON.stringify(state.completed));
  localStorage.setItem('sd_bookmarks', JSON.stringify(state.bookmarks));
  localStorage.setItem('sd_streak', state.streak);
  localStorage.setItem('sd_lastDate', state.lastDate);
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.add('hidden'), duration);
}

function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
  document.getElementById('view-' + view).classList.remove('hidden');
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`[data-view="${view}"]`);
  if (link) link.classList.add('active');
  state.currentView = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function diffColor(d) {
  return d === 'easy' ? 'diff-easy' : d === 'medium' ? 'diff-medium' : 'diff-hard';
}

function getQ(id) { return QUESTIONS.find(q => q.id === id); }

function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    state.streak = state.lastDate === yesterday ? state.streak + 1 : 1;
    state.lastDate = today;
    save();
  }
  const sc = document.getElementById('streakCount');
  const ps = document.getElementById('pStreak');
  if (sc) sc.textContent = state.streak;
  if (ps) ps.textContent = state.streak;
}

// ── Card Builder ───────────────────────────────────────────
function buildCard(q) {
  const done = state.completed.includes(q.id);
  const bookmarked = state.bookmarks.includes(q.id);
  const div = document.createElement('div');
  div.className = 'q-card' + (done ? ' completed' : '');
  div.setAttribute('data-id', q.id);
  div.innerHTML = `
    <span class="bookmark-star ${bookmarked ? 'active' : ''}" title="Bookmark">&#9733;</span>
    <div class="q-card-top">
      <div class="q-card-icon">${q.icon}</div>
      <div class="q-card-meta">
        <div class="q-card-company">${q.company}</div>
        <div class="q-card-title">${q.title}</div>
      </div>
    </div>
    <div class="q-card-desc">${q.desc}</div>
    <div class="q-card-footer">
      <div class="q-card-tags">${q.tags.slice(0,2).map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="q-card-read-time">&#9201; ${q.readTime || '20 min'}</span>
        <span class="diff-badge ${diffColor(q.difficulty)}">${q.difficulty}</span>
      </div>
    </div>`;
  const star = div.querySelector('.bookmark-star');
  star.addEventListener('click', e => {
    e.stopPropagation();
    const idx = state.bookmarks.indexOf(q.id);
    if (idx === -1) { state.bookmarks.push(q.id); star.classList.add('active'); showToast('&#9733; Bookmarked!'); }
    else { state.bookmarks.splice(idx, 1); star.classList.remove('active'); showToast('Bookmark removed'); }
    save();
  });
  div.addEventListener('click', () => openQuestion(q.id));
  return div;
}

// ── Shuffle ────────────────────────────────────────────────
function shuffleQuestion() {
  let list = QUESTIONS;
  if (state.filterDiff !== 'all') list = list.filter(q => q.difficulty === state.filterDiff);
  const topic = TOPICS.find(t => t.id === state.filterTopic);
  if (topic && state.filterTopic !== 'all') list = list.filter(q => topic.questions.includes(q.id));
  if (!list.length) { showToast('No questions match current filters'); return; }
  const pick = list[Math.floor(Math.random() * list.length)];
  openQuestion(pick.id);
  showToast('Shuffled to: ' + pick.title);
}

// ── Home View ──────────────────────────────────────────────
function renderHome() {
  const featured = QUESTIONS.filter(q => q.difficulty !== 'easy').slice(0, 6);
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = '';
  featured.forEach(q => grid.appendChild(buildCard(q)));

  const chips = document.getElementById('topicChipsHome');
  chips.innerHTML = '';
  TOPICS.slice(1).forEach(t => {
    const c = document.createElement('div');
    c.className = 'topic-chip';
    c.textContent = t.label;
    c.addEventListener('click', () => {
      state.filterTopic = t.id;
      navigateTo('questions');
      renderQuestions();
      updateTopicChips('topicChipsQ', t.id);
    });
    chips.appendChild(c);
  });
}

// ── Questions View ─────────────────────────────────────────
function renderQuestions() {
  const grid = document.getElementById('questionsGrid');
  grid.innerHTML = '';
  let list = QUESTIONS;
  if (state.filterDiff !== 'all') list = list.filter(q => q.difficulty === state.filterDiff);
  const topic = TOPICS.find(t => t.id === state.filterTopic);
  if (topic && state.filterTopic !== 'all') list = list.filter(q => topic.questions.includes(q.id));
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:60px">No questions match your filters.</div>';
    return;
  }
  list.forEach(q => grid.appendChild(buildCard(q)));
}

function updateTopicChips(containerId, activeId) {
  document.querySelectorAll(`#${containerId} .topic-chip`).forEach(c => {
    c.classList.toggle('active', c.dataset.topicId === activeId);
  });
}

function renderTopicChips(containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  TOPICS.forEach(t => {
    const c = document.createElement('div');
    c.className = 'topic-chip' + (t.id === state.filterTopic ? ' active' : '');
    c.dataset.topicId = t.id;
    c.textContent = t.label;
    c.addEventListener('click', () => {
      state.filterTopic = t.id;
      renderQuestions();
      updateTopicChips(containerId, t.id);
    });
    el.appendChild(c);
  });
}

// ── Question Detail ────────────────────────────────────────
function openQuestion(id) {
  const q = getQ(id);
  if (!q) return;
  state.currentQuestion = q;
  state.currentTab = 'overview';
  navigateTo('detail');
  renderDetail(q);
}

function renderDetail(q) {
  renderSidebar(q);
  renderDetailContent(q, state.currentTab);
}

function renderSidebar(q) {
  const done = state.completed.includes(q.id);
  document.getElementById('sidebarInfo').innerHTML = `
    <div class="sidebar-q-icon">${q.icon}</div>
    <div class="sidebar-q-title">${q.title}</div>
    <div class="meta-row" style="margin-top:8px">
      <span class="diff-badge ${diffColor(q.difficulty)}">${q.difficulty}</span>
      <span class="meta-chip">&#9201; ${q.readTime}</span>
    </div>`;

  const tabs = ['overview','requirements','architecture','deepdive','tradeoffs','qa','tips'];
  const labels = {
    overview:'&#128203; Overview',
    requirements:'&#9989; Requirements',
    architecture:'&#127959;&#65039; HLD Diagram',
    deepdive:'&#128300; Component Deep Dive',
    tradeoffs:'&#9878;&#65039; Trade-offs',
    qa:'&#10067; Interview Q&A',
    tips:'&#128161; Tips & Framework'
  };
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  tabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = 'sidebar-nav-item' + (tab === state.currentTab ? ' active' : '');
    item.innerHTML = `<span class="nav-dot"></span>${labels[tab]}`;
    item.addEventListener('click', () => {
      state.currentTab = tab;
      document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderDetailContent(q, tab);
    });
    nav.appendChild(item);
  });

  const related = document.getElementById('sidebarRelated');
  if (q.related && q.related.length) {
    related.innerHTML = `<div class="sidebar-related-title">Related Questions</div>` +
      q.related.map(rid => {
        const rq = getQ(rid);
        return rq ? `<div class="related-item" data-rid="${rid}">${rq.icon} ${rq.title}</div>` : '';
      }).join('');
    related.querySelectorAll('.related-item').forEach(el => {
      el.addEventListener('click', () => openQuestion(parseInt(el.dataset.rid)));
    });
  }
}

function renderDetailContent(q, tab) {
  const main = document.getElementById('detailMain');
  const done = state.completed.includes(q.id);
  const bookmarked = state.bookmarks.includes(q.id);

  let html = `
    <div class="detail-hero">
      <div class="detail-hero-icon">${q.icon}</div>
      <div class="detail-hero-body">
        <div class="detail-hero-company">${q.company}</div>
        <div class="detail-hero-title">${q.title}</div>
        <div class="detail-hero-desc">${q.desc}</div>
        <div class="detail-hero-tags">${q.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="detail-hero-actions">
          <button class="complete-btn ${done?'done':''}" id="completeBtn">
            ${done ? '&#9989; Completed' : '&#9675; Mark as Done'}
          </button>
          <button class="bookmark-btn ${bookmarked?'bookmarked':''}" id="bookmarkBtn">
            ${bookmarked ? '&#9733; Bookmarked' : '&#9734; Bookmark'}
          </button>
          <span class="meta-chip">&#9201; ${q.readTime}</span>
          <span class="diff-badge ${diffColor(q.difficulty)}">${q.difficulty}</span>
        </div>
      </div>
    </div>`;

  if (tab === 'overview') html += buildOverview(q);
  else if (tab === 'requirements') html += buildRequirements(q);
  else if (tab === 'architecture') html += buildArchitecture(q);
  else if (tab === 'deepdive') html += buildDeepDive(q);
  else if (tab === 'tradeoffs') html += buildTradeoffs(q);
  else if (tab === 'qa') html += buildQA(q);
  else if (tab === 'tips') html += buildTips(q);

  main.innerHTML = html;

  document.getElementById('completeBtn')?.addEventListener('click', () => toggleComplete(q));
  document.getElementById('bookmarkBtn')?.addEventListener('click', () => {
    const idx = state.bookmarks.indexOf(q.id);
    if (idx === -1) { state.bookmarks.push(q.id); showToast('&#9733; Bookmarked!'); }
    else { state.bookmarks.splice(idx, 1); showToast('Bookmark removed'); }
    save();
    renderDetail(q);
  });

  main.querySelectorAll('.qa-question').forEach(qEl => {
    qEl.addEventListener('click', () => {
      const item = qEl.closest('.qa-item');
      const wasOpen = item.classList.contains('open');
      main.querySelectorAll('.qa-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

function copySection(type) {
  const el = document.getElementById('copy-target-' + type);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => showToast('Copied to clipboard!'));
}

// ── OVERVIEW ───────────────────────────────────────────────
function buildOverview(q) {
  let html = `
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#128202;</span>Capacity Estimation</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Scale numbers to frame design decisions. Always derive these from first principles in the interview.</p>
      <div class="capacity-grid">
        ${q.capacity.map(c => `
          <div class="cap-card">
            <div class="cap-label">${c.label}</div>
            <div class="cap-value">${c.value}</div>
            <div class="cap-unit">${c.unit}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">
        <span class="icon">&#129518;</span>Back-of-Envelope Math
        <button class="copy-sec-btn" onclick="copySection('boe')">Copy Math</button>
      </div>
      <div class="boe-grid" id="copy-target-boe">
        ${(q.boe || []).map(b => `
          <div class="boe-row">
            <div class="boe-label">${b.label}</div>
            <div class="boe-calc"><code>${b.calc}</code></div>
            <div class="boe-result">${b.result}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#128204;</span>Problem Scope</div>
      <div class="scope-grid">
        <div class="scope-card in-scope">
          <div class="scope-label">&#9989; In Scope</div>
          <ul class="req-list">${(q.scope?.in||[]).map(s=>`<li data-icon="&#9989;">${s}</li>`).join('')}</ul>
        </div>
        <div class="scope-card out-scope">
          <div class="scope-label">&#10060; Out of Scope</div>
          <ul class="req-list">${(q.scope?.out||[]).map(s=>`<li data-icon="&#10060;">${s}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`;

  const resolvedLinks = typeof QUESTION_LINKS !== 'undefined' ? QUESTION_LINKS[q.id] : null;
  if (resolvedLinks) {
    html += `
    <div class="detail-section" style="margin-top:24px;">
      <div class="detail-section-title"><span class="icon">🔗</span>Further Reading</div>
      <ul style="padding-left:20px;line-height:1.6;font-size:14px;margin-top:12px;">
        ${resolvedLinks.map(l => `<li style="margin-bottom:8px;"><a href="${l.url}" target="_blank" style="color:var(--neon-cyan);text-decoration:none;">${l.label} ↗</a></li>`).join('')}
      </ul>
    </div>`;
  }
  return html;
}

// ── REQUIREMENTS ───────────────────────────────────────────
function buildRequirements(q) {
  return `
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#9989;</span>Functional Requirements</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">What the system must <em>do</em>. Clarify these with the interviewer in the first 5 minutes.</p>
      <ul class="req-list">
        ${q.requirements.functional.map(r => `<li data-icon="&#9989;">${r}</li>`).join('')}
      </ul>
    </div>
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#9881;&#65039;</span>Non-Functional Requirements</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">How the system must <em>behave</em>. These drive most architectural decisions.</p>
      <ul class="req-list">
        ${q.requirements.nonFunctional.map(r => `<li data-icon="&#9881;&#65039;">${r}</li>`).join('')}
      </ul>
    </div>
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#128451;&#65039;</span>Data Model</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Core entities and their relationships. Pick your DB type to match the access patterns.</p>
      ${buildDataModel(q)}
    </div>`;
}

function buildDataModel(q) {
  if (!q.dataModel) return '<p style="color:var(--text-muted);font-size:13px">Data model coming soon.</p>';
  return `<div class="dm-tables">${q.dataModel.map(t => `
    <div class="dm-table">
      <div class="dm-table-header">${t.entity} <span class="dm-db-badge">${t.db}</span></div>
      <table class="dm-schema">
        <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
        <tbody>${t.fields.map(f=>`<tr><td><code>${f.name}</code></td><td><span style="color:var(--accent2);font-family:'JetBrains Mono',monospace;font-size:12px">${f.type}</span></td><td style="color:var(--text-muted);font-size:12px">${f.note}</td></tr>`).join('')}</tbody>
      </table>
    </div>`).join('')}</div>`;
}

// ── HLD ARCHITECTURE ───────────────────────────────────────
function buildArchitecture(q) {
  if (!q.hld) return '<div class="detail-section"><p style="color:var(--text-muted)">HLD coming soon.</p></div>';

  let html = `
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#127959;&#65039;</span>High-Level Design — System Architecture</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">
        Full architecture as discussed in a FAANG system design interview. Each layer is color-coded by role. Hover nodes for details.
      </p>
      <div class="hld-diagram">`;

  q.hld.layers.forEach(layer => {
    html += `<div class="hld-layer">
      <div class="hld-layer-label">${layer.label}</div>
      <div class="hld-layer-nodes">`;
    layer.nodes.forEach(node => {
      html += `<div class="hld-node hld-${node.type || 'service'}" title="${node.detail||''}">
        <div class="hld-node-icon">${node.icon}</div>
        <div class="hld-node-name">${node.name}</div>
        ${node.note ? `<div class="hld-node-note">${node.note}</div>` : ''}
      </div>`;
    });
    html += `</div></div>`;
    if (layer.arrow) {
      html += `<div class="hld-layer-arrow"><div class="hld-arrow-line"></div><div class="hld-arrow-label">${layer.arrow}</div></div>`;
    }
  });

  html += `</div>`;

  if (q.hld.flows) {
    html += `<div class="hld-flows">
      <div class="hld-flows-title">&#128260; Key Data Flows</div>
      ${q.hld.flows.map((f,i) => `
        <div class="hld-flow-item">
          <div class="hld-flow-step">${i+1}</div>
          <div class="hld-flow-text"><strong>${f.title}:</strong> ${f.desc}</div>
        </div>`).join('')}
    </div>`;
  }

  html += `</div>`;

  if (q.apis) {
    html += `<div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#128268;</span>API Design</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Core REST or gRPC endpoints the system must expose.</p>
      <div class="api-list">
        ${q.apis.map(a => `
          <div class="api-item">
            <div class="api-method method-${a.method.toLowerCase()}">${a.method}</div>
            <div class="api-path"><code>${a.path}</code></div>
            <div class="api-desc">${a.desc}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  return html;
}

// ── DEEP DIVE ──────────────────────────────────────────────
function buildDeepDive(q) {
  if (!q.deepDive) return '<div class="detail-section"><p style="color:var(--text-muted)">Deep dive coming soon.</p></div>';
  return q.deepDive.map(d => `
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">${d.icon}</span>${d.title}</div>
      <div class="deepdive-body">
        ${d.points.map(p => `
          <div class="dd-point">
            <div class="dd-point-title">${p.heading}</div>
            <div class="dd-point-text">${p.body}</div>
          </div>`).join('')}
      </div>
      ${d.diagram ? `<div class="dd-flow">${d.diagram.map((step,i) =>
        `<div class="dd-step"><span class="dd-step-num">${i+1}</span><span>${step}</span></div>`
      ).join('<div class="dd-step-arrow">&#8595;</div>')}</div>` : ''}
    </div>`).join('');
}

// ── TRADE-OFFS ─────────────────────────────────────────────
function buildTradeoffs(q) {
  if (!q.tradeoffs || !q.tradeoffs.length) {
    return `<div class="detail-section"><p style="color:var(--text-muted)">Trade-offs coming soon for this question.</p></div>`;
  }
  return `
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#9878;&#65039;</span>Design Trade-offs &amp; Decisions</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">
        In FAANG interviews, explaining <em>why</em> you chose a design over alternatives is as important as the design itself.
      </p>
      <table class="tradeoff-table">
        <thead><tr><th>Design Decision</th><th>&#9989; Pro</th><th>&#10060; Con</th><th>When to Use</th></tr></thead>
        <tbody>
          ${q.tradeoffs.map(t => `
            <tr>
              <td><strong>${t.option}</strong></td>
              <td class="tradeoff-pro">${t.pro}</td>
              <td class="tradeoff-con">${t.con}</td>
              <td style="color:var(--text-muted);font-size:13px">${t.when || '&mdash;'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${q.bottlenecks ? `<div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#128680;</span>Bottlenecks &amp; Failure Scenarios</div>
      <div class="bottleneck-list">
        ${q.bottlenecks.map(b => `
          <div class="bottleneck-item">
            <div class="bn-problem"><span class="bn-icon">&#9889;</span><strong>${b.problem}</strong></div>
            <div class="bn-solution">&#8594; ${b.solution}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}`;
}

// ── Q&A ────────────────────────────────────────────────────
function buildQA(q) {
  if (!q.qa || !q.qa.length) {
    return `<div class="detail-section"><p style="color:var(--text-muted)">Q&amp;A coming soon for this question.</p></div>`;
  }
  return `
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#10067;</span>FAANG Interview Q&amp;A</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
        Real follow-up questions asked at Google, Meta, Amazon, and Uber. Click to reveal expert answers.
      </p>
      <div class="qa-list">
        ${q.qa.map((item, i) => `
          <div class="qa-item" id="qa-${i}">
            <div class="qa-question">
              <span class="qa-q-icon">&#128172;</span>
              <span style="flex:1;font-weight:600">${item.q}</span>
              <span class="qa-toggle">+</span>
            </div>
            <div class="qa-answer">
              <div class="qa-answer-text">${item.a}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── TIPS ───────────────────────────────────────────────────
function buildTips(q) {
  const tips = q.tips || [
    { icon: '&#128273;', title: 'Clarify First', text: ' Always spend ~5 minutes clarifying scope, scale, and constraints before drawing any architecture.' },
    { icon: '&#129518;', title: 'Show Your Math', text: ' Derive capacity numbers from first principles. Show the arithmetic explicitly on the whiteboard.' },
    { icon: '&#127851;', title: 'Think in Layers', text: ' Structure your design: Client → Gateway → Services → Cache → DB. Cover each layer methodically.' }
  ];
  return `
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#128161;</span>Interview Strategy &amp; Tips</div>
      <div class="tips-list">
        ${tips.map(t => `
          <div class="tip-item">
            <span class="tip-icon">${t.icon}</span>
            <div class="tip-text"><strong>${t.title}</strong>${t.text}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#9201;</span>45-Minute Interview Timeline</div>
      <div class="timeline">
        <div class="tl-item"><div class="tl-time">0–5 min</div><div class="tl-content"><strong>Clarify Requirements</strong><br><span style="color:var(--text-muted);font-size:13px">Ask about scale (DAU, QPS), core features, platform (mobile/web), SLAs. Write assumptions on the board.</span></div></div>
        <div class="tl-item"><div class="tl-time">5–10 min</div><div class="tl-content"><strong>Capacity Estimation</strong><br><span style="color:var(--text-muted);font-size:13px">Derive read/write QPS, storage per day/year, bandwidth. Show arithmetic explicitly.</span></div></div>
        <div class="tl-item"><div class="tl-time">10–20 min</div><div class="tl-content"><strong>High-Level Design</strong><br><span style="color:var(--text-muted);font-size:13px">Draw the full system: clients → LB → services → caches → DB → queues. Explain each component's role.</span></div></div>
        <div class="tl-item"><div class="tl-time">20–35 min</div><div class="tl-content"><strong>Deep Dive (2 components)</strong><br><span style="color:var(--text-muted);font-size:13px">Go deep on the hardest parts. Let the interviewer guide focus.</span></div></div>
        <div class="tl-item"><div class="tl-time">35–45 min</div><div class="tl-content"><strong>Trade-offs &amp; Follow-ups</strong><br><span style="color:var(--text-muted);font-size:13px">Discuss what you'd do differently, scaling to 10x, failure scenarios, monitoring &amp; alerting.</span></div></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title"><span class="icon">&#128142;</span>Interviewer Signal: What They're Looking For</div>
      <div class="signals-grid">
        <div class="signal-card signal-green">
          <div class="signal-hdr">&#9989; Strong Hire</div>
          <ul>${(q.signals?.hire||['Proactively clarified requirements','Showed math behind estimates','Identified bottlenecks before being asked','Justified every design decision','Mentioned monitoring and failure handling']).map(s=>`<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="signal-card signal-red">
          <div class="signal-hdr">&#10060; No Hire</div>
          <ul>${(q.signals?.nohire||['Jumped to solution without clarifying','Could not estimate scale','Over-engineered simple components','No awareness of trade-offs','Passive, waited for hints']).map(s=>`<li>${s}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`;
}

function toggleComplete(q) {
  const idx = state.completed.indexOf(q.id);
  if (idx === -1) {
    state.completed.push(q.id);
    showToast('&#9989; Marked as completed! Great work!');
    updateStreak();
  } else {
    state.completed.splice(idx, 1);
    showToast('Marked as incomplete.');
  }
  save();
  renderDetail(q);
  updateProgressRing();
}

// ── CONCEPTS ───────────────────────────────────────────────
const CONCEPT_CATS = {
  c1:'infra', c2:'infra', c3:'data', c4:'patterns', c5:'infra', c6:'data',
  c7:'data',  c8:'infra', c9:'patterns', c10:'patterns', c11:'infra', c12:'data',
  c13:'data', c14:'data', c15:'data', c16:'data', c17:'patterns', c18:'patterns',
  c19:'compare', c20:'compare'
};
let conceptFilterText = '';
let conceptFilterCat = 'all';

function renderConcepts(filterText, filterCat) {
  if (filterText !== undefined) conceptFilterText = filterText;
  if (filterCat  !== undefined) conceptFilterCat  = filterCat;

  const grid = document.getElementById('conceptsGrid');
  grid.innerHTML = '';
  let list = CONCEPTS;
  if (conceptFilterCat !== 'all') list = list.filter(c => CONCEPT_CATS[c.id] === conceptFilterCat);
  if (conceptFilterText) list = list.filter(c =>
    c.title.toLowerCase().includes(conceptFilterText) ||
    c.desc.toLowerCase().includes(conceptFilterText) ||
    c.tags.some(t => t.toLowerCase().includes(conceptFilterText))
  );

  const badge = document.getElementById('conceptsCount');
  if (badge) badge.textContent = list.length;

  if (!list.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:40px;text-align:center">No concepts match your filter.</p>';
    renderDecisionLab();
    return;
  }

  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'concept-card';
    card.style.setProperty('--card-accent', c.color);
    const resolvedLinks = c.links || (typeof CONCEPT_LINKS !== 'undefined' ? CONCEPT_LINKS[c.id] : null);
    card.innerHTML = `
      <div class="concept-icon">${c.icon}</div>
      <div class="concept-title">${c.title}</div>
      <div class="concept-desc">${c.desc}</div>
      <div class="concept-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      ${(c.detail || resolvedLinks) ? `<div class="concept-detail" style="display:none">${c.detail || ''}${resolvedLinks ? `<div class="concept-links" style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;"><strong>Further Reading:</strong><ul style="margin-top:4px;padding-left:20px;font-size:0.9em;">${resolvedLinks.map(l=>`<li style="margin-bottom:4px;"><a href="${l.url}" target="_blank" style="color:var(--neon-cyan);text-decoration:none;" onclick="event.stopPropagation()">${l.label} ↗</a></li>`).join('')}</ul></div>` : ''}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      const det = card.querySelector('.concept-detail');
      if (det) det.style.display = det.style.display === 'block' ? 'none' : 'block';
    });
    grid.appendChild(card);
  });
  renderDecisionLab();
}

function renderSpecialGrid(gridId, list) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'concept-card';
    card.style.setProperty('--card-accent', c.color);
    const resolvedLinks = c.links || (typeof CONCEPT_LINKS !== 'undefined' ? CONCEPT_LINKS[c.id] : null);
    card.innerHTML = `
      <div class="concept-icon">${c.icon}</div>
      <div class="concept-title">${c.title}</div>
      <div class="concept-desc">${c.desc}</div>
      <div class="concept-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      ${(c.detail || resolvedLinks) ? `<div class="concept-detail" style="display:none">${c.detail || ''}${resolvedLinks ? `<div class="concept-links" style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;"><strong>Further Reading:</strong><ul style="margin-top:4px;padding-left:20px;font-size:0.9em;">${resolvedLinks.map(l=>`<li style="margin-bottom:4px;"><a href="${l.url}" target="_blank" style="color:var(--neon-cyan);text-decoration:none;" onclick="event.stopPropagation()">${l.label} ↗</a></li>`).join('')}</ul></div>` : ''}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      const det = card.querySelector('.concept-detail');
      if (det) det.style.display = det.style.display === 'block' ? 'none' : 'block';
    });
    grid.appendChild(card);
  });
}

function renderDistSys() { renderSpecialGrid('distsysGrid', DISTRIBUTED_CONCEPTS); }
function renderMicrosec() { renderSpecialGrid('microsecGrid', MICROSERVICES_CONCEPTS); }
// ── Decision Lab ───────────────────────────────────────────
const LAB_REQS = [
  { id: 'write', label: '&#128640; High Write Throughput' },
  { id: 'consistency', label: '&#128274; Strong Consistency (ACID)' },
  { id: 'joins', label: '&#128279; Complex Relational Joins' },
  { id: 'global', label: '&#127757; Global/Multi-region' },
  { id: 'analytics', label: '&#128202; Large-scale Analytics' },
  { id: 'realtime', label: '&#127754; Real-time Stream Processing' },
  { id: 'schemaless', label: '&#128194; Flexible Schema' }
];

let selectedReqs = new Set();

function renderDecisionLab() {
  const controls = document.getElementById('labControls');
  if (!controls) return;
  controls.innerHTML = '';
  LAB_REQS.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'lab-toggle' + (selectedReqs.has(r.id) ? ' active' : '');
    btn.innerHTML = `<span class="lab-toggle-icon">${selectedReqs.has(r.id) ? '&#9679;' : '&#9675;'}</span>${r.label}`;
    btn.addEventListener('click', () => {
      if (selectedReqs.has(r.id)) selectedReqs.delete(r.id);
      else selectedReqs.add(r.id);
      renderDecisionLab();
      showResults();
    });
    controls.appendChild(btn);
  });
}

function showResults() {
  const res = document.getElementById('labResults');
  if (!selectedReqs.size) {
    res.innerHTML = '<div class="results-placeholder">Select requirements to see recommendations...</div>';
    return;
  }
  let techs = [];
  
  // 1. Core Databases
  if (selectedReqs.has('consistency') && selectedReqs.has('joins')) {
    techs.push({ name: 'PostgreSQL / MySQL', cat: 'Relational (SQL)', reason: 'Strong ACID compliance and relational integrity are mandatory for these requirements.' });
  } else if (selectedReqs.has('write') && selectedReqs.has('global')) {
    techs.push({ name: 'Google Spanner / CockroachDB', cat: 'Distributed SQL', reason: 'Provides global consistency with horizontal scalability using TrueTime or similar mechanisms.' });
  } else if (selectedReqs.has('write') && selectedReqs.has('schemaless')) {
    techs.push({ name: 'Apache Cassandra / ScyllaDB', cat: 'Wide-Column NoSQL', reason: 'Peer-to-peer architecture handles massive writes across regions with tunable consistency.' });
  } else if (selectedReqs.has('schemaless')) {
    techs.push({ name: 'MongoDB / DynamoDB', cat: 'Document / KV', reason: 'Scalable storage for flexible metadata with easy horizontal scaling.' });
  }

  // 2. High-performance / Real-time
  if (selectedReqs.has('realtime')) {
    techs.push({ name: 'Redis / Memcached', cat: 'In-Memory Cache', reason: 'Essential for sub-10ms latency and high-frequency read/write operations.' });
    if (selectedReqs.has('global')) {
      techs.push({ name: 'Cloudflare Workers / Akamai', cat: 'Edge Computing', reason: 'Move computation to the edge to minimize RTT for a global user base.' });
    }
  }

  // 3. Specialized Engines
  if (selectedReqs.has('analytics')) {
    techs.push({ name: 'ClickHouse / Snowflake', cat: 'OLAP / Data Warehouse', reason: 'Optimized for complex aggregate queries on massive multi-terabyte datasets.' });
  }
  if (selectedReqs.has('write') && selectedReqs.has('realtime')) {
    techs.push({ name: 'Apache Kafka / Pulsar', cat: 'Message Bus', reason: 'Decouples producer/consumer and provides high-durability event streaming.' });
  }

  if (!techs.length) {
    res.innerHTML = '<div class="results-placeholder">No single tech fits all these. Consider a Polyglot approach (using multiple DBs).</div>';
    return;
  }

  res.innerHTML = `
    <div class="results-title">System Design Strategy:</div>
    <div class="lab-results-list">
      ${techs.map(t => `
        <div class="lab-result-card">
          <div class="lrc-cat">${t.cat}</div>
          <div class="lrc-name">${t.name}</div>
          <p class="lrc-reason">${t.reason}</p>
        </div>
      `).join('')}
    </div>
  `;
}

// ── PROGRESS ───────────────────────────────────────────────
function renderProgress() {
  const total = QUESTIONS.length;
  const done = state.completed.length;
  const pct = Math.round((done / total) * 100);
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('pCompleted').textContent = done;
  document.getElementById('pTotal').textContent = total;
  document.getElementById('pStreak').textContent = state.streak;

  const circle = document.getElementById('progressRingCircle');
  setTimeout(() => { if (circle) circle.style.strokeDashoffset = 314 - (pct / 100) * 314; }, 100);

  // Breakdown by difficulty
  const breakdownEl = document.getElementById('progressBreakdown');
  if (breakdownEl) {
    const diffs = ['easy', 'medium', 'hard'];
    const colors = { easy: 'var(--green)', medium: 'var(--yellow)', hard: 'var(--red)' };
    const counts = {};
    const doneCounts = {};
    diffs.forEach(d => {
      counts[d] = QUESTIONS.filter(q => q.difficulty === d).length;
      doneCounts[d] = state.completed.filter(id => { const q = getQ(id); return q && q.difficulty === d; }).length;
    });
    breakdownEl.innerHTML = `
      <div class="breakdown-title">By Difficulty</div>
      ${diffs.map(d => `
        <div class="breakdown-row">
          <div class="breakdown-label" style="color:${colors[d]}">${d}</div>
          <div class="breakdown-bar-wrap">
            <div class="breakdown-bar" style="width:${counts[d] ? (doneCounts[d]/counts[d]*100) : 0}%;background:${colors[d]}"></div>
          </div>
          <div class="breakdown-count">${doneCounts[d]}/${counts[d]}</div>
        </div>`).join('')}`;
  }

  const list = document.getElementById('progressList');
  list.innerHTML = '';
  QUESTIONS.forEach(q => {
    const isDone = state.completed.includes(q.id);
    const item = document.createElement('div');
    item.className = 'progress-item';
    item.innerHTML = `
      <div class="progress-item-icon">${q.icon}</div>
      <div class="progress-item-info">
        <div class="progress-item-title">${q.title}</div>
        <div class="progress-item-meta">${q.company} &middot; <span class="diff-badge ${diffColor(q.difficulty)}" style="padding:1px 8px;font-size:11px">${q.difficulty}</span></div>
      </div>
      <div class="progress-item-status ${isDone ? 'status-done' : 'status-pending'}">${isDone ? '&#10003;' : '&#9675;'}</div>`;
    item.addEventListener('click', () => openQuestion(q.id));
    list.appendChild(item);
  });
}

function updateProgressRing() {
  const total = QUESTIONS.length;
  const done = state.completed.length;
  const pct = Math.round((done / total) * 100);
  const el = document.getElementById('progressPct');
  const comp = document.getElementById('pCompleted');
  const circle = document.getElementById('progressRingCircle');
  if (el) el.textContent = pct + '%';
  if (comp) comp.textContent = done;
  if (circle) circle.style.strokeDashoffset = 314 - (pct / 100) * 314;
}

// ── SEARCH ─────────────────────────────────────────────────
function openSearch() {
  document.getElementById('searchOverlay').classList.remove('hidden');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
  setTimeout(() => document.getElementById('searchInput').focus(), 50);
}
function closeSearch() {
  document.getElementById('searchOverlay').classList.add('hidden');
}

function doSearch(query) {
  const res = document.getElementById('searchResults');
  const q = query.trim().toLowerCase();
  if (!q) { res.innerHTML = ''; return; }
  const matches = QUESTIONS.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.tags.some(t => t.toLowerCase().includes(q)) ||
    item.company.toLowerCase().includes(q) ||
    item.desc.toLowerCase().includes(q)
  );
  if (!matches.length) {
    res.innerHTML = '<div class="search-empty">No questions found. Try different keywords.</div>';
    return;
  }
  res.innerHTML = '';
  matches.forEach(item => {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.innerHTML = `
      <div class="search-result-icon">${item.icon}</div>
      <div class="search-result-info">
        <div class="search-result-title">${item.title}</div>
        <div class="search-result-meta">${item.company} &middot; <span class="${diffColor(item.difficulty)}">${item.difficulty}</span></div>
      </div>`;
    div.addEventListener('click', () => { closeSearch(); openQuestion(item.id); });
    res.appendChild(div);
  });
}

// ── UNIVERSAL TRADEOFFS ────────────────────────────────────
function renderUniversalTradeoffs() {
  const grid = document.getElementById('tradeoffsUniversalGrid');
  if (!grid) return;
  grid.innerHTML = '';
  UNIVERSAL_TRADEOFFS.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = 'ut-card';
    card.style.animationDelay = `${idx * 0.05}s`;
    card.innerHTML = `
      <div class="ut-header">
        <div class="ut-icon">${t.icon}</div>
        <div class="ut-title">${t.title}</div>
      </div>
      <div class="ut-desc">${t.desc}</div>
      <div class="ut-grid">
        <div class="ut-item pro">
          <div class="ut-label">✅ PROS / STRENGTHS</div>
          <div class="ut-text">${t.pro}</div>
        </div>
        <div class="ut-item con">
          <div class="ut-label">⚠️ CONS / RISKS</div>
          <div class="ut-text">${t.con}</div>
        </div>
      </div>
      <div class="ut-analogy-row">
        <span class="ut-analogy-icon">💡</span>
        <span class="ut-analogy-text"><strong>Mental Model:</strong> ${t.analogy}</span>
      </div>
      </div>
      ${(typeof TRADEOFF_LINKS !== 'undefined' && TRADEOFF_LINKS[t.title]) ? `
      <div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.05);padding-top:12px;font-size:12px;">
        <strong style="color:var(--text-muted)">Deep Dive:</strong>
        <ul style="margin-top:6px;padding-left:16px;">
          ${TRADEOFF_LINKS[t.title].map(l => `<li style="margin-bottom:4px;"><a href="${l.url}" target="_blank" style="color:var(--neon-cyan);text-decoration:none;">${l.label} ↗</a></li>`).join('')}
        </ul>
      </div>` : ''}
    `;
    grid.appendChild(card);
  });
}

// ── QUIZ MODE ──────────────────────────────────────────────
let quizIndex = 0;
let quizFlipped = false;

function startQuiz() {
  quizIndex = 0; quizFlipped = false;
  const overlay = document.getElementById('quizOverlay');
  if (overlay) { overlay.classList.remove('hidden'); renderQuizCard(); }
}
function closeQuiz() {
  const overlay = document.getElementById('quizOverlay');
  if (overlay) overlay.classList.add('hidden');
}
function renderQuizCard() {
  const c = CONCEPTS[quizIndex];
  const total = CONCEPTS.length;
  const pt = document.getElementById('quizProgressText');
  const pb = document.getElementById('quizProgressBar');
  const fi = document.getElementById('quizFrontIcon');
  const ft = document.getElementById('quizFrontTitle');
  const bd = document.getElementById('quizBackDesc');
  const card = document.getElementById('quizCard');
  if (pt) pt.textContent = `Card ${quizIndex+1} of ${total}`;
  if (pb) pb.style.width = ((quizIndex+1)/total*100) + '%';
  if (fi) fi.textContent = c.icon;
  if (ft) ft.textContent = c.title;
  if (bd) bd.textContent = c.desc;
  quizFlipped = false;
  if (card) card.classList.remove('flipped');
}

// ── THEME MANAGEMENT ─────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = '☀️';
  }
}
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = isLight ? '☀️' : '🌙';
  showToast(isLight ? 'Light Mode Activated' : 'Dark Mode Activated');
}

// ── INIT ───────────────────────────────────────────────────
function init() {
  initTheme();
  updateStreak();
  renderHome();
  renderTopicChips('topicChipsQ');
  renderQuestions();
  renderConcepts();
  renderDistSys();
  renderMicrosec();
  renderUniversalTradeoffs();
  renderProgress();

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const view = link.dataset.view;
      navigateTo(view);
      if (view === 'questions') renderQuestions();
      if (view === 'tradeoffs') renderUniversalTradeoffs();
      if (view === 'distsys') renderDistSys();
      if (view === 'microsec') renderMicrosec();
      if (view === 'progress') renderProgress();
    });
  });

  document.getElementById('startBtn')?.addEventListener('click', () => { navigateTo('questions'); renderQuestions(); });
  document.getElementById('conceptsBtn')?.addEventListener('click', () => navigateTo('concepts'));
  document.getElementById('viewAllBtn')?.addEventListener('click', () => {
    state.filterTopic = 'all'; state.filterDiff = 'all';
    navigateTo('questions'); renderQuestions();
  });
  document.getElementById('backBtn')?.addEventListener('click', () => { navigateTo('questions'); renderQuestions(); });
  document.getElementById('shuffleBtn')?.addEventListener('click', shuffleQuestion);

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filterDiff = btn.dataset.diff;
      renderQuestions();
    });
  });

  // Search
  document.getElementById('searchBtn')?.addEventListener('click', openSearch);
  document.getElementById('searchClose')?.addEventListener('click', closeSearch);
  document.getElementById('searchBackdrop')?.addEventListener('click', closeSearch);
  document.getElementById('searchInput')?.addEventListener('input', e => doSearch(e.target.value));

  // Concept filter
  document.getElementById('conceptSearchInput')?.addEventListener('input', e => renderConcepts(e.target.value.toLowerCase(), undefined));
  document.querySelectorAll('.concept-cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.concept-cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderConcepts(undefined, chip.dataset.cat);
    });
  });

  // Theme

  // Quiz
  document.getElementById('quizCloseBtn')?.addEventListener('click', closeQuiz);
  document.getElementById('quizCardWrap')?.addEventListener('click', () => {
    quizFlipped = !quizFlipped;
    document.getElementById('quizCard')?.classList.toggle('flipped', quizFlipped);
  });
  document.getElementById('quizNextBtn')?.addEventListener('click', () => {
    if (quizIndex < CONCEPTS.length - 1) { quizIndex++; renderQuizCard(); }
    else { closeQuiz(); showToast('Quiz complete! Great job.'); }
  });
  document.getElementById('quizPrevBtn')?.addEventListener('click', () => {
    if (quizIndex > 0) { quizIndex--; renderQuizCard(); }
  });

  // Shortcuts panel
  const shortcutsBtn = document.getElementById('shortcutsBtn');
  const shortcutsOverlay = document.getElementById('shortcutsOverlay');
  shortcutsBtn?.addEventListener('click', () => shortcutsOverlay?.classList.toggle('hidden'));
  shortcutsOverlay?.addEventListener('click', e => { if (e.target === shortcutsOverlay) shortcutsOverlay.classList.add('hidden'); });

  // Global keyboard shortcuts
  let gKeyBuffer = '';
  document.addEventListener('keydown', e => {
    const inInput = ['INPUT','TEXTAREA'].includes(document.activeElement.tagName);
    if (e.key === 'Escape') {
      closeSearch();
      closeQuiz();
      shortcutsOverlay?.classList.add('hidden');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (!inInput && e.key === '?') shortcutsOverlay?.classList.toggle('hidden');
    if (!inInput && e.key === 'g') { gKeyBuffer = 'g'; return; }
    if (!inInput && gKeyBuffer === 'g') {
      if (e.key === 'q') { navigateTo('questions'); renderQuestions(); }
      if (e.key === 'c') navigateTo('concepts');
      if (e.key === 't') { navigateTo('tradeoffs'); renderUniversalTradeoffs(); }
      gKeyBuffer = '';
    }

    if (!inInput && e.shiftKey && e.key === 'R') shuffleQuestion();
  });

  window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 10);
    const btt = document.getElementById('backToTop');
    if (btt) btt.classList.toggle('visible', state.currentView === 'detail' && window.scrollY > 400);
  });

  document.getElementById('backToTop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('DOMContentLoaded', init);
