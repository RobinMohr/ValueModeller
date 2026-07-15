// ─── Tab Switching ───────────────────────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');

  if (tabId === 'tasks') {
    taskManager.loadTasks();
  }
  if (tabId === 'errors') {
    errorManager.loadErrors();
  }
}

// ─── TecFactory (WebSocket) ──────────────────────────────────────────────────

class TecFactory {
  constructor() {
    this.ws = null;
    this.agents = new Map();
    this.autoScroll = new Map();
    this.collapsedAgents = new Set(JSON.parse(sessionStorage.getItem('tf_collapsed') || '[]'));
    this.connect();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => this.setConnectionStatus(true);
    this.ws.onclose = () => {
      this.setConnectionStatus(false);
      setTimeout(() => this.connect(), 2000);
    };
    this.ws.onerror = () => this.setConnectionStatus(false);
    this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
  }

  setConnectionStatus(connected) {
    const el = document.getElementById('connectionStatus');
    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');
    dot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
    text.textContent = connected ? 'Connected' : 'Reconnecting...';
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'init': this.initAgents(msg.agents); break;
      case 'output': this.appendOutput(msg.agentId, msg.entry); break;
      case 'status': this.updateStatus(msg.agentId, msg.status); break;
      case 'history': this.loadHistory(msg.agentId, msg.output); break;
      case 'rollback': this.handleRollback(msg.agentId, msg.log); break;
      case 'activity': this.updateActivity(msg.agentId, msg.activity); break;
      case 'agent-created':
        this.addAgentCard(msg.agent);
        break;
      case 'agent-updated':
        this.refreshAgents();
        break;
      case 'agent-deleted':
        this.removeAgentCard(msg.agentId);
        break;
      case 'task-created':
      case 'task-updated':
      case 'task-deleted':
      case 'tasks-changed':
        if (document.getElementById('tab-tasks').classList.contains('active')) {
          taskManager.loadTasks();
        }
        break;
      case 'response':
        if (msg.error) console.error(`${msg.action} failed: ${msg.error}`);
        break;
    }
  }

  initAgents(agentList) {
    const grid = document.getElementById('agentsGrid');
    grid.innerHTML = '';

    // Default to collapsed if no preference has been saved yet
    const hasPreference = sessionStorage.getItem('tf_collapsed') !== null;
    if (!hasPreference) {
      for (const agent of agentList) {
        this.collapsedAgents.add(agent.id);
      }
      this.persistCollapsed();
    }

    for (const agent of agentList) {
      this.agents.set(agent.id, agent);
      this.autoScroll.set(agent.id, true);
      grid.appendChild(this.createAgentCard(agent));
      // Render initial activity state if available
      if (agent.currentActivity) {
        this.updateActivity(agent.id, agent.currentActivity);
      }
      this.send({ action: 'getOutput', agentId: agent.id });
    }
    this.updateGlobalCollapseButtons();
  }

  async refreshAgents() {
    try {
      const res = await fetch('/api/agents');
      const agents = await res.json();
      this.initAgents(agents);
    } catch (err) {
      console.error('Failed to refresh agents:', err);
    }
  }

  addAgentCard(agent) {
    this.agents.set(agent.id, agent);
    this.autoScroll.set(agent.id, true);
    const grid = document.getElementById('agentsGrid');
    grid.appendChild(this.createAgentCard(agent));
  }

  removeAgentCard(agentId) {
    this.agents.delete(agentId);
    this.autoScroll.delete(agentId);
    const card = document.getElementById(`card-${agentId}`);
    if (card) card.remove();
  }

  createAgentCard(agent) {
    const card = document.createElement('div');
    card.className = `agent-card ${agent.status}`;
    card.id = `card-${agent.id}`;

    const typeBadge = agentManager.getTypeBadgeHtml(agent.type);
    const configSummary = agentManager.getConfigSummary(agent);

    card.innerHTML = `
      <div class="agent-header">
        <div class="agent-info">
          <div class="agent-name-row">
            <span class="agent-name">${esc(agent.name)}</span>
            ${typeBadge}
          </div>
          <span class="agent-description">${esc(agent.description || '')}</span>
          <span class="agent-config-summary">${configSummary}</span>
          <div class="agent-activity" id="activity-${agent.id}" style="display:none;"></div>
        </div>
        <div class="agent-meta">
          <span class="agent-status-badge ${agent.status}" id="badge-${agent.id}">
            ${statusIcon(agent.status)} ${agent.status}
          </span>
          <div class="agent-controls">
            <button class="btn btn-collapse" id="collapse-${agent.id}" title="Collapse logs"
                    onclick="monitor.toggleCollapse('${agent.id}')">&#9660;</button>
            <button class="btn btn-start" id="start-${agent.id}"
                    onclick="monitor.startAgent('${agent.id}')"
                    ${agent.status === 'running' ? 'disabled' : ''}>&#9654; Start</button>
            <button class="btn btn-stop" id="stop-${agent.id}"
                    onclick="monitor.stopAgent('${agent.id}')"
                    ${agent.status !== 'running' ? 'disabled' : ''}>&#9632; Stop</button>
            <button class="btn btn-clear" onclick="monitor.clearOutput('${agent.id}')">Clear</button>
            <button class="btn btn-clear" onclick="monitor.copyOutput('${agent.id}')" title="Copy all logs">&#128203; Copy</button>
            <button class="btn-icon" title="Edit" onclick="agentManager.editAgent('${agent.id}')">&#9998;</button>
            <button class="btn-icon btn-icon-danger" title="Delete" onclick="agentManager.deleteAgent('${agent.id}', '${esc(agent.name)}')">&#128465;</button>
          </div>
        </div>
      </div>
      <div class="agent-output" id="output-${agent.id}" tabindex="0">
        <div class="empty-state">No output yet. Start the agent to see its stream.</div>
      </div>
    `;
    const outputEl = card.querySelector('.agent-output');
    outputEl.addEventListener('scroll', () => {
      const atBottom = outputEl.scrollHeight - outputEl.clientHeight <= outputEl.scrollTop + 50;
      this.autoScroll.set(agent.id, atBottom);
    });
    outputEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(outputEl);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
    // Apply initial collapse state from session storage
    if (this.collapsedAgents.has(agent.id)) {
      card.classList.add('collapsed');
      outputEl.style.display = 'none';
      const toggleBtn = card.querySelector(`#collapse-${agent.id}`);
      if (toggleBtn) { toggleBtn.innerHTML = '&#9650;'; toggleBtn.title = 'Expand logs'; }
    }
    return card;
  }

  appendOutput(agentId, entry) {
    const outputEl = document.getElementById(`output-${agentId}`);
    if (!outputEl) return;
    const emptyState = outputEl.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const line = document.createElement('div');
    line.className = 'output-line';
    const time = new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerHTML = `<span class="output-timestamp">${time}</span><span class="output-text ${entry.stream}">${ansiToHtml(entry.text)}</span>`;
    outputEl.appendChild(line);
    if (this.autoScroll.get(agentId)) outputEl.scrollTop = outputEl.scrollHeight;
    while (outputEl.children.length > 500) outputEl.removeChild(outputEl.firstChild);
  }

  loadHistory(agentId, output) {
    const outputEl = document.getElementById(`output-${agentId}`);
    if (!outputEl || output.length === 0) return;
    outputEl.innerHTML = '';
    for (const entry of output) this.appendOutput(agentId, entry);
  }

  updateStatus(agentId, status) {
    const card = document.getElementById(`card-${agentId}`);
    if (!card) return;
    card.className = `agent-card ${status}`;
    const badge = document.getElementById(`badge-${agentId}`);
    if (badge) { badge.className = `agent-status-badge ${status}`; badge.innerHTML = `${statusIcon(status)} ${status}`; }
    const startBtn = document.getElementById(`start-${agentId}`);
    const stopBtn = document.getElementById(`stop-${agentId}`);
    if (startBtn) startBtn.disabled = status === 'running';
    if (stopBtn) stopBtn.disabled = status !== 'running';

    // Clear activity when stopped
    if (status !== 'running') {
      this.updateActivity(agentId, null);
    }
  }

  updateActivity(agentId, activity) {
    const activityEl = document.getElementById(`activity-${agentId}`);
    if (!activityEl) return;

    if (!activity || !activity.type || activity.type === 'idle') {
      activityEl.style.display = 'none';
      activityEl.innerHTML = '';
      return;
    }

    const icons = {
      working: '&#128736;',    // wrench
      testing: '&#128270;',    // magnifying glass
      researching: '&#128218;', // book
      'creating-tasks': '&#9999;', // pencil
      waiting: '&#9203;',      // hourglass
      active: '&#9889;'        // lightning
    };

    const labels = {
      working: 'Working on',
      testing: 'Testing',
      researching: 'Researching',
      'creating-tasks': 'Writing',
      waiting: 'Waiting for next cycle',
      active: 'Active'
    };

    const icon = icons[activity.type] || '&#9889;';
    const label = labels[activity.type] || activity.type;
    const taskText = activity.task ? `: <strong>${esc(activity.task)}</strong>` : '';
    const activityClass = activity.type === 'waiting' ? 'activity-waiting' : 'activity-working';

    activityEl.style.display = 'flex';
    activityEl.className = `agent-activity ${activityClass}`;
    activityEl.innerHTML = `<span class="activity-icon">${icon}</span><span class="activity-text">${label}${taskText}</span>`;
  }

  clearOutput(agentId) {
    const el = document.getElementById(`output-${agentId}`);
    if (el) el.innerHTML = '<div class="empty-state">Output cleared.</div>';
  }

  copyOutput(agentId) {
    const el = document.getElementById(`output-${agentId}`);
    if (!el) return;
    const lines = el.querySelectorAll('.output-line');
    if (lines.length === 0) return;
    const text = Array.from(lines).map(line => {
      const ts = line.querySelector('.output-timestamp');
      const txt = line.querySelector('.output-text');
      const timestamp = ts ? ts.textContent : '';
      const content = txt ? txt.textContent : '';
      return `${timestamp}  ${content}`;
    }).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      // Brief visual feedback
      const btn = el.closest('.agent-card').querySelector('[title="Copy all logs"]');
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '&#10003; Copied';
        setTimeout(() => { btn.innerHTML = original; }, 1500);
      }
    }).catch(() => {
      // Fallback: select all text in the output div
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  handleRollback(agentId, log) {
    // Show rollback results as system messages in the agent output
    for (const message of log) {
      const entry = {
        timestamp: new Date().toISOString(),
        stream: 'system',
        text: `⏪ ${message}`
      };
      this.appendOutput(agentId, entry);
    }
    // Final summary
    const summary = {
      timestamp: new Date().toISOString(),
      stream: 'system',
      text: `✅ Rollback complete (${log.length} action${log.length !== 1 ? 's' : ''} performed)`
    };
    this.appendOutput(agentId, summary);
  }

  // ─── Collapse / Expand ─────────────────────────────────────────────────────

  persistCollapsed() {
    sessionStorage.setItem('tf_collapsed', JSON.stringify([...this.collapsedAgents]));
  }

  toggleCollapse(agentId) {
    if (this.collapsedAgents.has(agentId)) {
      this.collapsedAgents.delete(agentId);
    } else {
      this.collapsedAgents.add(agentId);
    }
    this.persistCollapsed();
    this.applyCollapseState(agentId);
    this.updateGlobalCollapseButtons();
  }

  applyCollapseState(agentId) {
    const card = document.getElementById(`card-${agentId}`);
    if (!card) return;
    const outputEl = document.getElementById(`output-${agentId}`);
    const toggleBtn = document.getElementById(`collapse-${agentId}`);
    const collapsed = this.collapsedAgents.has(agentId);

    if (collapsed) {
      card.classList.add('collapsed');
      if (outputEl) outputEl.style.display = 'none';
      if (toggleBtn) { toggleBtn.innerHTML = '&#9650;'; toggleBtn.title = 'Expand logs'; }
    } else {
      card.classList.remove('collapsed');
      if (outputEl) outputEl.style.display = 'block';
      if (toggleBtn) { toggleBtn.innerHTML = '&#9660;'; toggleBtn.title = 'Collapse logs'; }
    }
  }

  collapseAll() {
    for (const [agentId] of this.agents) {
      this.collapsedAgents.add(agentId);
      this.applyCollapseState(agentId);
    }
    this.persistCollapsed();
    this.updateGlobalCollapseButtons();
  }

  expandAll() {
    this.collapsedAgents.clear();
    for (const [agentId] of this.agents) {
      this.applyCollapseState(agentId);
    }
    this.persistCollapsed();
    this.updateGlobalCollapseButtons();
  }

  updateGlobalCollapseButtons() {
    const collapseBtn = document.getElementById('collapseAllBtn');
    const expandBtn = document.getElementById('expandAllBtn');
    const allCollapsed = this.agents.size > 0 && this.collapsedAgents.size >= this.agents.size;

    if (collapseBtn) collapseBtn.style.display = allCollapsed ? 'none' : 'inline-flex';
    if (expandBtn) expandBtn.style.display = allCollapsed ? 'inline-flex' : 'none';
  }

  startAgent(agentId) { this.send({ action: 'start', agentId }); }
  stopAgent(agentId) { this.showStopDialog(agentId); }

  showStopDialog(agentId) {
    const agent = this.agents.get(agentId);
    const name = agent ? agent.name : agentId;
    const overlay = document.getElementById('stopAgentOverlay');
    const title = document.getElementById('stopAgentTitle');
    const desc = document.getElementById('stopAgentDescription');
    const rollbackCheck = document.getElementById('stopAgentRollback');

    title.textContent = `Stop "${name}"?`;
    desc.textContent = 'The agent process will be forcefully killed.';
    rollbackCheck.checked = true; // default to rollback

    overlay.dataset.agentId = agentId;
    overlay.style.display = 'flex';
  }

  confirmStop() {
    const overlay = document.getElementById('stopAgentOverlay');
    const agentId = overlay.dataset.agentId;
    const rollback = document.getElementById('stopAgentRollback').checked;

    this.send({ action: 'stop', agentId, rollback });
    overlay.style.display = 'none';

    if (rollback) {
      const entry = {
        timestamp: new Date().toISOString(),
        stream: 'system',
        text: '⏪ Rollback requested — reverting in-progress tasks and uncommitted changes...'
      };
      this.appendOutput(agentId, entry);
    }
  }

  cancelStop() {
    document.getElementById('stopAgentOverlay').style.display = 'none';
  }

  send(msg) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg)); }
}

// ─── Agent Manager (CRUD) ────────────────────────────────────────────────────

class AgentManager {
  constructor() {
    this.editingId = null;
    this.agentTypes = [];
    this.loadTypes();
  }

  async loadTypes() {
    try {
      const res = await fetch('/api/agent-types');
      this.agentTypes = await res.json();
    } catch (err) {
      // Fallback defaults
      this.agentTypes = [
        { id: 'dev', name: 'Developer', defaultAgent: 'developer-agent', defaultTimeout: 900, defaultInterval: 0 },
        { id: 'qa', name: 'QA / Research', defaultAgent: 'qa-improvement-agent', defaultTimeout: 600, defaultInterval: 30 },
        { id: 'task-order', name: 'Task Prioritization', defaultAgent: 'task-order-agent', defaultTimeout: 300, defaultInterval: 0 },
        { id: 'custom', name: 'Custom', defaultAgent: '', defaultTimeout: 600, defaultInterval: 0 }
      ];
    }
  }

  getTypeBadgeHtml(type) {
    const typeLabels = { dev: 'DEV', qa: 'QA', 'task-order': 'PRIO', custom: 'CUSTOM' };
    const label = typeLabels[type] || type.toUpperCase();
    return `<span class="agent-type-badge type-${type}">${label}</span>`;
  }

  getConfigSummary(agent) {
    const parts = [];
    const interval = agent.intervalSeconds ?? 0;
    const timeout = agent.timeoutSeconds ?? 900;
    const maxIter = agent.maxIterations ?? 0;

    parts.push(`Timeout: ${timeout}s`);
    parts.push(`Interval: ${interval}s`);
    parts.push(`Runs: ${maxIter === 0 ? '∞' : maxIter}`);
    return parts.join(' · ');
  }

  showCreateForm() {
    this.editingId = null;
    document.getElementById('agentFormTitle').textContent = 'New Agent';
    document.getElementById('agentFormSubmitBtn').textContent = 'Create Agent';
    document.getElementById('agentFormId').value = '';

    // Reset form
    document.getElementById('agentForm').reset();
    document.getElementById('agentInterval').value = '0';
    document.getElementById('agentTimeout').value = '900';
    document.getElementById('agentMaxIterations').value = '0';
    this.onTypeChange();

    document.getElementById('agentFormOverlay').style.display = 'flex';
  }

  async editAgent(agentId) {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) throw new Error('Agent not found');
      const agent = await res.json();

      this.editingId = agentId;
      document.getElementById('agentFormTitle').textContent = 'Edit Agent';
      document.getElementById('agentFormSubmitBtn').textContent = 'Save Changes';
      document.getElementById('agentFormId').value = agentId;

      document.getElementById('agentName').value = agent.name || '';
      document.getElementById('agentType').value = agent.type || 'dev';
      document.getElementById('agentAgentName').value = agent.agent || '';
      document.getElementById('agentDescription').value = agent.description || '';
      document.getElementById('agentInterval').value = agent.intervalSeconds ?? 0;
      document.getElementById('agentTimeout').value = agent.timeoutSeconds ?? 900;
      document.getElementById('agentMaxIterations').value = agent.maxIterations ?? 0;
      document.getElementById('agentCustomPrompt').value = agent.customPrompt || '';

      this.onTypeChange();
      document.getElementById('agentFormOverlay').style.display = 'flex';
    } catch (err) {
      alert('Failed to load agent: ' + err.message);
    }
  }

  hideForm() {
    document.getElementById('agentFormOverlay').style.display = 'none';
    this.editingId = null;
  }

  onTypeChange() {
    const type = document.getElementById('agentType').value;
    const customGroup = document.getElementById('customPromptGroup');
    const agentNameInput = document.getElementById('agentAgentName');

    // Show/hide custom prompt field
    customGroup.style.display = type === 'custom' ? 'flex' : 'none';

    // Auto-fill agent name from type defaults (only if creating new)
    if (!this.editingId) {
      const typeInfo = this.agentTypes.find(t => t.id === type);
      if (typeInfo) {
        agentNameInput.value = typeInfo.defaultAgent;
        document.getElementById('agentTimeout').value = typeInfo.defaultTimeout;
        document.getElementById('agentInterval').value = typeInfo.defaultInterval;
      }
    }
  }

  async submitForm(event) {
    event.preventDefault();

    const type = document.getElementById('agentType').value;
    const payload = {
      name: document.getElementById('agentName').value.trim(),
      type,
      agent: document.getElementById('agentAgentName').value.trim(),
      description: document.getElementById('agentDescription').value.trim(),
      intervalSeconds: parseInt(document.getElementById('agentInterval').value) || 0,
      timeoutSeconds: parseInt(document.getElementById('agentTimeout').value) || 900,
      maxIterations: parseInt(document.getElementById('agentMaxIterations').value) || 0,
    };

    if (type === 'custom') {
      payload.customPrompt = document.getElementById('agentCustomPrompt').value.trim();
      if (!payload.customPrompt) {
        alert('Custom prompt is required for custom agent type.');
        return;
      }
    }

    try {
      let res;
      if (this.editingId) {
        res = await fetch(`/api/agents/${this.editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save agent');
      }

      this.hideForm();
      // Refresh agents list
      monitor.refreshAgents();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async deleteAgent(agentId, name) {
    if (!confirm(`Delete agent "${name}"? This will stop it if running.`)) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      // Card removal handled via WebSocket broadcast
      monitor.removeAgentCard(agentId);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
}

// ─── Task Manager ────────────────────────────────────────────────────────────

class TaskManager {
  constructor() {
    this.tasks = [];
    this.currentFilter = 'all';
    this.editingFilename = null;
    this.currentMode = 'manual';
  }

  async loadTasks() {
    try {
      const res = await fetch('/api/tasks');
      this.tasks = await res.json();
      this.renderTasks();
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }

  renderTasks() {
    const container = document.getElementById('tasksList');
    let filtered = this.tasks;
    if (this.currentFilter !== 'all') {
      filtered = this.tasks.filter(t => t.state === this.currentFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state-box">No tasks found. Create one to get started!</div>';
      return;
    }

    container.innerHTML = filtered.map(task => {
      const origin = task.origin || 'user';
      const originIcons = { user: '&#128100;', ai: '&#129302;', 'user-assisted': '&#129309;' };
      const originLabels = { user: 'User', ai: 'AI', 'user-assisted': 'Assisted' };
      const stateLabels = { todo: 'To Do', 'in-progress': 'In Progress', developed: 'Developed', done: 'Done' };
      const originIcon = originIcons[origin] || originIcons.user;
      const originLabel = originLabels[origin] || origin;
      const stateLabel = stateLabels[task.state] || task.state || 'To Do';

      return `
      <div class="task-card" data-state="${task.state || 'todo'}">
        <div class="task-card-header">
          <div class="task-card-left">
            <span class="task-priority-badge priority-${task.priority}">P${task.priority}</span>
            <span class="task-type-badge type-${task.type || 'improvement'}">${task.type || 'improvement'}</span>
            <span class="task-origin-badge origin-${origin}" title="Created by: ${originLabel}">${originIcon} ${originLabel}</span>
            <h3 class="task-title">${esc(task.title)}</h3>
          </div>
          <div class="task-card-right">
            <span class="task-state-badge state-${task.state || 'todo'}">${stateLabel}</span>
            <button class="btn-icon" title="Edit" onclick="taskManager.editTask('${task._filename}')">&#9998;</button>
            <button class="btn-icon btn-icon-danger" title="Delete" onclick="taskManager.deleteTask('${task._filename}', '${esc(task.title)}')">&#128465;</button>
          </div>
        </div>
        <p class="task-description">${esc(task.description || '')}</p>
        <div class="task-meta-row">
          ${task.files && task.files.length ? `<span class="task-meta-item task-files">&#128193; ${task.files.map(f => esc(f)).join(', ')}</span>` : ''}
        </div>
      </div>
    `;
    }).join('');
  }

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.task-mode-toggle .mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');

    const form = document.getElementById('taskForm');
    const aiPanel = document.getElementById('taskAiAssistPanel');

    if (mode === 'ai-assist') {
      form.style.display = 'none';
      aiPanel.style.display = 'block';
    } else {
      form.style.display = 'block';
      aiPanel.style.display = 'none';
    }
  }

  showCreateForm() {
    this.editingFilename = null;
    this.currentMode = 'manual';
    document.getElementById('taskFormTitle').textContent = 'New Task';
    document.getElementById('taskFormSubmitBtn').textContent = 'Create Task';
    document.getElementById('taskFormFilename').value = '';

    // Reset form
    document.getElementById('taskForm').reset();
    document.getElementById('taskAiPrompt').value = '';

    // Hide state and origin fields when creating
    document.getElementById('taskStateGroup').style.display = 'none';
    document.getElementById('taskOriginRow').style.display = 'none';

    // Show mode toggle
    document.getElementById('taskModeToggle').style.display = 'flex';

    // Reset to manual mode
    this.setMode('manual');

    // Reset AI assist status
    document.getElementById('aiAssistStatus').style.display = 'none';

    document.getElementById('taskFormOverlay').style.display = 'flex';
  }

  async editTask(filename) {
    try {
      const res = await fetch(`/api/tasks/${filename}`);
      const task = await res.json();

      this.editingFilename = filename;
      document.getElementById('taskFormTitle').textContent = 'Edit Task';
      document.getElementById('taskFormSubmitBtn').textContent = 'Save Changes';
      document.getElementById('taskFormFilename').value = filename;

      document.getElementById('taskTitle').value = task.title || '';
      document.getElementById('taskPriority').value = task.priority || 2;
      document.getElementById('taskType').value = task.type || 'improvement';
      document.getElementById('taskState').value = task.state || 'todo';
      document.getElementById('taskDescription').value = task.description || '';
      document.getElementById('taskFiles').value = (task.files || []).join(', ');
      document.getElementById('taskOrigin').value = task.origin || 'user';

      // Show state and origin fields when editing (origin is read-only)
      document.getElementById('taskStateGroup').style.display = 'block';
      document.getElementById('taskOriginRow').style.display = 'flex';

      // Hide mode toggle when editing
      document.getElementById('taskModeToggle').style.display = 'none';

      // Force manual mode when editing
      this.setMode('manual');

      document.getElementById('taskFormOverlay').style.display = 'flex';
    } catch (err) {
      alert('Failed to load task: ' + err.message);
    }
  }

  hideForm() {
    document.getElementById('taskFormOverlay').style.display = 'none';
    this.editingFilename = null;
  }

  async submitForm(event) {
    event.preventDefault();

    const task = {
      title: document.getElementById('taskTitle').value.trim(),
      type: document.getElementById('taskType').value,
      priority: parseInt(document.getElementById('taskPriority').value),
      description: document.getElementById('taskDescription').value.trim(),
      files: document.getElementById('taskFiles').value.split(',').map(f => f.trim()).filter(Boolean),
    };

    // When editing, include state and preserve origin
    if (this.editingFilename) {
      task.state = document.getElementById('taskState').value;
      task.origin = document.getElementById('taskOrigin').value;
    } else {
      // When creating manually, auto-set state and origin
      task.state = 'todo';
      task.origin = 'user';
    }

    Object.keys(task).forEach(k => { if (task[k] === undefined || (Array.isArray(task[k]) && task[k].length === 0)) delete task[k]; });

    try {
      if (this.editingFilename) {
        await fetch(`/api/tasks/${this.editingFilename}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        });
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        });
      }
      this.hideForm();
      await this.loadTasks();
    } catch (err) {
      alert('Failed to save task: ' + err.message);
    }
  }

  async submitAiAssist() {
    const prompt = document.getElementById('taskAiPrompt').value.trim();
    if (!prompt) {
      alert('Please enter a description of what you need.');
      return;
    }

    const statusEl = document.getElementById('aiAssistStatus');
    const statusText = document.getElementById('aiAssistStatusText');
    const submitBtn = document.getElementById('taskAiSubmitBtn');

    // Show loading state
    statusEl.style.display = 'flex';
    statusText.textContent = 'Generating task with AI...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate task');
      }

      const task = await res.json();
      statusText.textContent = `Task created: "${task.title}"`;

      // Brief success display then close
      setTimeout(() => {
        this.hideForm();
        this.loadTasks();
      }, 1500);
    } catch (err) {
      statusText.textContent = `Error: ${err.message}`;
      statusEl.classList.add('ai-assist-error');
      submitBtn.disabled = false;
      submitBtn.textContent = '🔄 Retry';
      setTimeout(() => {
        statusEl.style.display = 'none';
        statusEl.classList.remove('ai-assist-error');
        submitBtn.textContent = '\u{1F916} Generate Task';
      }, 6000);
    }
  }

  async deleteTask(filename, title) {
    if (!confirm(`Delete task "${title}"?`)) return;
    try {
      await fetch(`/api/tasks/${filename}`, { method: 'DELETE' });
      await this.loadTasks();
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  }
}

// ─── Task Filter ─────────────────────────────────────────────────────────────

function filterTasks(filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
  taskManager.currentFilter = filter;
  taskManager.renderTasks();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function ansiToHtml(text) {
  if (!text) return '';

  const rawText = text || '';
  const parts = [];
  let lastIndex = 0;
  let currentStyles = {};
  let match;

  const ansiRawRegex = /(?:\x1b|\u001b)\[([0-9;]*)m/g;

  while ((match = ansiRawRegex.exec(rawText)) !== null) {
    const before = rawText.slice(lastIndex, match.index);
    if (before) {
      parts.push({ text: before, styles: { ...currentStyles } });
    }
    lastIndex = match.index + match[0].length;

    const params = match[1] ? match[1].split(';').map(Number) : [0];
    let i = 0;
    while (i < params.length) {
      const p = params[i];
      if (p === 0) {
        currentStyles = {};
      } else if (p === 1) {
        currentStyles.bold = true;
      } else if (p === 2) {
        currentStyles.dim = true;
      } else if (p === 3) {
        currentStyles.italic = true;
      } else if (p === 4) {
        currentStyles.underline = true;
      } else if (p >= 30 && p <= 37) {
        currentStyles.fg = `ansi-fg-${p - 30}`;
      } else if (p >= 40 && p <= 47) {
        currentStyles.bg = `ansi-bg-${p - 40}`;
      } else if (p >= 90 && p <= 97) {
        currentStyles.fg = `ansi-fg-bright-${p - 90}`;
      } else if (p >= 100 && p <= 107) {
        currentStyles.bg = `ansi-bg-bright-${p - 100}`;
      } else if (p === 38 && params[i + 1] === 5) {
        currentStyles.fg256 = params[i + 2];
        delete currentStyles.fg;
        i += 2;
      } else if (p === 48 && params[i + 1] === 5) {
        currentStyles.bg256 = params[i + 2];
        delete currentStyles.bg;
        i += 2;
      } else if (p === 39) {
        delete currentStyles.fg;
        delete currentStyles.fg256;
      } else if (p === 49) {
        delete currentStyles.bg;
        delete currentStyles.bg256;
      }
      i++;
    }
  }

  const remaining = rawText.slice(lastIndex);
  if (remaining) {
    parts.push({ text: remaining, styles: { ...currentStyles } });
  }

  return parts.map(part => {
    const escapedText = esc(part.text);
    const s = part.styles;
    const hasStyle = Object.keys(s).length > 0;
    if (!hasStyle) return escapedText;

    const classes = [];
    const inlineStyles = [];

    if (s.bold) classes.push('ansi-bold');
    if (s.dim) classes.push('ansi-dim');
    if (s.italic) classes.push('ansi-italic');
    if (s.underline) classes.push('ansi-underline');
    if (s.fg) classes.push(s.fg);
    if (s.bg) classes.push(s.bg);
    if (s.fg256 !== undefined) inlineStyles.push(`color: ${ansi256ToColor(s.fg256)}`);
    if (s.bg256 !== undefined) inlineStyles.push(`background-color: ${ansi256ToColor(s.bg256)}`);

    const classAttr = classes.length ? ` class="${classes.join(' ')}"` : '';
    const styleAttr = inlineStyles.length ? ` style="${inlineStyles.join(';')}"` : '';
    return `<span${classAttr}${styleAttr}>${escapedText}</span>`;
  }).join('');
}

function ansi256ToColor(n) {
  const basic16 = [
    '#282c34', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#abb2bf',
    '#5c6370', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#ffffff'
  ];
  if (n < 16) return basic16[n];

  if (n < 232) {
    const idx = n - 16;
    const r = Math.floor(idx / 36);
    const g = Math.floor((idx % 36) / 6);
    const b = idx % 6;
    const toHex = v => v === 0 ? '00' : (55 + v * 40).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  const level = 8 + (n - 232) * 10;
  const hex = level.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

function statusIcon(status) {
  switch (status) {
    case 'running': return '&#9679;';
    case 'stopped': return '&#9675;';
    case 'error': return '&#9888;';
    default: return '&#9675;';
  }
}

// ─── Error Manager ───────────────────────────────────────────────────────────

class ErrorManager {
  constructor() {
    this.errors = [];
  }

  async loadErrors() {
    try {
      const res = await fetch('/api/errors');
      this.errors = await res.json();
      this.renderErrors();
    } catch (err) {
      document.getElementById('errorsList').innerHTML =
        '<div class="errors-empty"><div class="errors-empty-icon">⚠️</div><div class="errors-empty-text">Failed to load errors</div></div>';
    }
  }

  async refresh() {
    await this.loadErrors();
  }

  renderErrors() {
    const container = document.getElementById('errorsList');
    const summary = document.getElementById('errorsSummary');
    const clearBtn = document.getElementById('clearAllErrorsBtn');

    const count = this.errors.length;
    summary.querySelector('.errors-count').textContent = `${count} error${count !== 1 ? 's' : ''}`;
    clearBtn.style.display = count > 0 ? 'inline-flex' : 'none';

    if (count === 0) {
      container.innerHTML = `
        <div class="errors-empty">
          <div class="errors-empty-icon">✅</div>
          <div class="errors-empty-text">No errors recorded. Agents are running smoothly.</div>
        </div>`;
      return;
    }

    container.innerHTML = this.errors.map(err => {
      const timeStr = err.timestamp
        ? new Date(err.timestamp).toLocaleString()
        : err.filename.slice(0, 19).replace(/T/, ' ').replace(/-/g, (m, i) => i < 8 ? '-' : ':');
      return `
        <div class="error-card" onclick="errorManager.showDetail('${esc(err.filename)}')">
          <div class="error-card-header">
            <span class="error-card-agent">${esc(err.agent || 'Unknown Agent')}</span>
            <span class="error-card-time">${esc(timeStr)}</span>
          </div>
          <span class="error-card-type">${esc(err.type || 'error')}</span>
          ${err.errorSummary ? `<div class="error-card-summary">${esc(err.errorSummary)}</div>` : ''}
        </div>`;
    }).join('');
  }

  async showDetail(filename) {
    try {
      const res = await fetch(`/api/errors/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error('Failed to load error detail');
      const data = await res.json();

      const overlay = document.getElementById('errorDetailOverlay');
      const content = document.getElementById('errorDetailContent');
      const title = document.getElementById('errorDetailTitle');
      const deleteBtn = document.getElementById('errorDetailDeleteBtn');

      title.textContent = filename;
      content.innerHTML = this.markdownToHtml(data.content);

      deleteBtn.onclick = async () => {
        if (!confirm('Delete this error report?')) return;
        await this.deleteError(filename);
        this.hideDetail();
      };

      overlay.style.display = 'flex';
    } catch (err) {
      alert('Failed to load error details: ' + err.message);
    }
  }

  hideDetail() {
    document.getElementById('errorDetailOverlay').style.display = 'none';
  }

  async deleteError(filename) {
    try {
      await fetch(`/api/errors/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      await this.loadErrors();
    } catch (err) {
      alert('Failed to delete error: ' + err.message);
    }
  }

  async clearAll() {
    if (!confirm('Delete ALL error reports? This cannot be undone.')) return;
    try {
      await fetch('/api/errors', { method: 'DELETE' });
      await this.loadErrors();
    } catch (err) {
      alert('Failed to clear errors: ' + err.message);
    }
  }

  /** Simple markdown-to-HTML converter for error reports */
  markdownToHtml(md) {
    if (!md) return '';
    let html = md;

    // Code blocks (``` ... ```)
    html = html.replace(/```([^`]*?)```/gs, (_, code) => `<pre>${esc(code.trim())}</pre>`);

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Tables (simple markdown table support)
    html = html.replace(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)/g, (tableBlock) => {
      const rows = tableBlock.trim().split('\n');
      if (rows.length < 2) return tableBlock;
      const headerCells = rows[0].split('|').filter(c => c.trim());
      const bodyRows = rows.slice(2); // skip header and separator
      let table = '<table><thead><tr>';
      headerCells.forEach(cell => { table += `<th>${cell.trim()}</th>`; });
      table += '</tr></thead><tbody>';
      bodyRows.forEach(row => {
        const cells = row.split('|').filter(c => c.trim());
        table += '<tr>';
        cells.forEach(cell => { table += `<td>${cell.trim()}</td>`; });
        table += '</tr>';
      });
      table += '</tbody></table>';
      return table;
    });

    // Ordered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ol>${match}</ol>`);

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

    // Paragraphs (lines that aren't already wrapped in tags)
    html = html.replace(/^(?!<[a-z]|<\/|$)(.+)$/gm, '<p>$1</p>');

    // Clean up double newlines
    html = html.replace(/\n{2,}/g, '\n');

    return html;
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

const monitor = new TecFactory();
const agentManager = new AgentManager();
const taskManager = new TaskManager();
const errorManager = new ErrorManager();
