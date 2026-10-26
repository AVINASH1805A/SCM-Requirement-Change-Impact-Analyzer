// Global State Variables
let currentRequirements = [];
let currentArtifacts = {};
let currentTraceLinks = [];
let currentImpactResult = null;
let currentScmLog = [];
let currentBranches = [];
let currentGraphMode = 'req'; // 'req' for Requirement-to-Requirement Flow, 'full' for Full System Traceability
let currentPruningView = 'selected'; // 'selected' for Must Run, 'skipped' for Safely Pruned

// ─── AUTH GUARD ───────────────────────────────────────────────────────────────
const currentRole = sessionStorage.getItem('bzr_user_role');
const currentUser = sessionStorage.getItem('bzr_username');

// Redirect to login if not authenticated
if (!currentRole || !currentUser) {
  window.location.href = 'login.html';
}

function doLogout() {
  sessionStorage.removeItem('bzr_user_role');
  sessionStorage.removeItem('bzr_username');
  window.location.href = 'login.html';
}

function applyRoleUI() {
  const roleIcon = document.getElementById('role-icon');
  const roleLabel = document.getElementById('role-label');

  if (currentRole === 'admin') {
    if (roleIcon) roleIcon.textContent = '🛡️';
    if (roleLabel) roleLabel.textContent = 'Admin: ' + currentUser;
  } else {
    if (roleIcon) roleIcon.textContent = '👤';
    if (roleLabel) roleLabel.textContent = 'User: ' + currentUser;

    // Hide admin-only elements for regular users
    // Disable "Commit Change" buttons — they will be hidden after render
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });

    // Disable the Requirements & SCM Commit tab entirely for users
    const reqTabBtn = document.querySelector('[onclick="switchTab(\'req-tab\')"]');
    if (reqTabBtn) {
      reqTabBtn.style.opacity = '0.4';
      reqTabBtn.style.cursor = 'not-allowed';
      reqTabBtn.title = 'Admin access required';
      reqTabBtn.onclick = () => showAccessDenied();
    }
    const reqNavItem = document.getElementById('nav-req-tab');
    if (reqNavItem) {
      reqNavItem.style.opacity = '0.4';
      reqNavItem.style.cursor = 'not-allowed';
      reqNavItem.title = 'Admin access required';
      reqNavItem.onclick = () => showAccessDenied();
    }
  }
}

function showAccessDenied() {
  alert('🔒 Access Denied\n\nThis feature is available for Admin only.\n\nPlease login as Admin to access this section.');
}

// ─── SIDEBAR CONTROLLER ───────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  // On smaller screens (<= 992px), toggle mobile-open drawer
  if (window.innerWidth <= 992) {
    const isOpen = sidebar.classList.toggle('mobile-open');
    if (overlay) {
      overlay.classList.toggle('active', isOpen);
    }
  } else {
    // Desktop: toggle collapsed state and persist
    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('bzr_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    
    // Trigger graph redrawing when sidebar width changes
    setTimeout(() => {
      if (currentImpactResult && document.getElementById('impact-tab')?.classList.contains('active')) {
        drawGraph(currentImpactResult.graph);
      }
    }, 320);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

function initSidebarState() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;
  if (window.innerWidth > 992) {
    const isCollapsed = localStorage.getItem('bzr_sidebar_collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Initialize Dashboard on Page Load
document.addEventListener("DOMContentLoaded", () => {
  loadSavedTheme();
  initSidebarState();
  applyRoleUI();
  fetchInitialData();
  setupCanvasResize();
});


// Theme Switcher Logic — Dark / Light
function changeTheme(themeName) {
  document.body.className = '';
  if (themeName === 'light') {
    document.body.classList.add('theme-light');
  }
  localStorage.setItem('bzr_app_theme', themeName);
  // Sync dropdown
  const sel = document.getElementById('theme-selector');
  if (sel) sel.value = themeName;

  // Re-draw graph to update node label colours (black in light, light in dark)
  if (currentImpactResult && document.getElementById('impact-tab')?.classList.contains('active')) {
    drawGraph(currentImpactResult.graph);
  }
}

function loadSavedTheme() {
  const saved = localStorage.getItem('bzr_app_theme') || 'dark';
  changeTheme(saved);
}

// Fetch All Initial Data from REST API
async function fetchInitialData() {
  try {
    const [reqsRes, traceRes, branchesRes, scmRes] = await Promise.all([
      fetch('/api/requirements'),
      fetch('/api/traceability'),
      fetch('/api/scm/branches'),
      fetch('/api/scm/log')
    ]);

    currentRequirements = await reqsRes.json();
    const traceData = await traceRes.json();
    currentArtifacts = traceData.artifacts;
    currentTraceLinks = traceData.trace_links;
    currentBranches = await branchesRes.json();
    currentScmLog = await scmRes.json();

    const statReq = document.getElementById('stat-req-count');
    if (statReq) statReq.textContent = currentRequirements.length;

    renderRequirementDropdowns();
    renderRequirementTable();
    renderTraceabilityMatrix();
    renderDependenciesTable();
    populateDependencyDropdowns();
    renderScmLogs();
    renderBranchInfo();
    populateDiffSelectors();
    renderRecentScmActivity();
    renderRepoStatus();

    // Trigger initial impact analysis for default requirement
    runImpactAnalysis();
  } catch (err) {
    console.error("Failed to load initial server data:", err);
  }
}

// Tab Switching Handler
function switchTab(tabId) {
  // If on mobile screen, close drawer on navigation
  if (window.innerWidth <= 992) {
    closeMobileSidebar();
  }

  // Update tabs content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  const activeTabContent = document.getElementById(tabId);
  if (activeTabContent) {
    activeTabContent.classList.add('active');
  }

  // Update sidebar nav-items
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeNavItem = document.querySelector(`.nav-item[onclick*="'${tabId}'"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }

  // Also update old tab-btn for compatibility if present
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  if (tabId === 'impact-tab' && currentImpactResult) {
    setTimeout(() => drawGraph(currentImpactResult.graph), 50);
  } else if (tabId === 'report-tab') {
    generateReportView();
  } else if (tabId === 'pruning-tab' && lastTestPruningData) {
    renderFullPruningWorkspace(lastTestPruningData);
  } else if (tabId === 'deps-tab') {
    renderDependenciesTable();
  } else if (tabId === 'darcs-compare-tab') {
    loadScmComparisonData();
  }
}

// Render Requirement Dropdowns
function renderRequirementDropdowns() {
  const selectReq = document.getElementById('select-req');
  const editReq = document.getElementById('edit-req-id');
  
  if (!selectReq || !editReq) return;

  selectReq.innerHTML = '';
  editReq.innerHTML = '';

  currentRequirements.forEach(req => {
    const opt1 = document.createElement('option');
    opt1.value = req.id;
    opt1.textContent = `${req.id}: ${req.title} (v${req.version})`;
    selectReq.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = req.id;
    opt2.textContent = `${req.id}: ${req.title}`;
    editReq.appendChild(opt2);
  });

  loadReqIntoForm();
}

// Load Requirement Details into Edit Form
function loadReqIntoForm() {
  const editReqId = document.getElementById('edit-req-id')?.value;
  const req = currentRequirements.find(r => r.id === editReqId);
  if (!req) return;

  document.getElementById('edit-title').value = req.title || '';
  document.getElementById('edit-desc').value = req.description || '';
  document.getElementById('edit-priority').value = req.priority || 'HIGH';
  document.getElementById('commit-msg').value = `r${currentScmLog.length + 1}: Modify ${req.id} specification details`;
}

// Execute Impact Analysis Request
async function runImpactAnalysis() {
  let reqId = document.getElementById('select-req')?.value || 'REQ-101';
  if (reqId.includes(':')) {
    reqId = reqId.split(':')[0].trim();
  }
  if (!reqId) return;

  const severity = document.getElementById('change-severity')?.value || 'MEDIUM';
  const desc = document.getElementById('change-description')?.value || 'Simulated requirement change';

  const btn = document.getElementById('btn-run-impact');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analyzing...`;
    btn.style.opacity = '0.8';
  }

  // Show "analyzing" state on the results area
  const riskTag = document.getElementById('risk-level-tag');
  if (riskTag) { riskTag.textContent = 'ANALYZING'; riskTag.className = 'risk-level-tag tag-HIGH'; }

  try {
    const res = await fetch(`/api/impact/analyze?req_id=${encodeURIComponent(reqId)}&severity=${encodeURIComponent(severity)}&desc=${encodeURIComponent(desc)}`);
    if (!res.ok) {
      const errText = await res.text();
      showToast(`Server error ${res.status}: ${errText}`, 'error');
      return;
    }
    currentImpactResult = await res.json();

    if (currentImpactResult.error) {
      showToast(`Analysis error: ${currentImpactResult.error}`, 'error');
    } else {
      renderImpactSummary(currentImpactResult);
      flashResultCards();
      // Update "last analyzed" label on simulator card
      const lastAnalyzed = document.getElementById('last-analyzed-label');
      if (lastAnalyzed) {
        const now = new Date();
        lastAnalyzed.textContent = `Last run: ${now.toLocaleTimeString()}`;
        lastAnalyzed.style.display = 'block';
      }
      showToast(`✓ Impact analysis complete for ${reqId} — Risk: ${currentImpactResult.summary.risk_category}`, 'success');
      if (btn) {
        btn.style.opacity = '1';
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Analysis Complete!`;
        setTimeout(() => {
          if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.innerHTML = originalBtnHtml; }
        }, 2000);
        return; // don't hit finally re-enable early
      }
    }
  } catch (err) {
    console.error('Impact analysis failed:', err);
    showToast('Network error: could not reach server. Is server running on port 8081?', 'error');
  } finally {
    if (btn && btn.disabled) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = originalBtnHtml;
    }
  }
}

// Flash result cards to indicate data updated
function flashResultCards() {
  const els = [
    document.getElementById('stat-artifact-count'),
    document.getElementById('stat-risk-level'),
    document.getElementById('stat-risk-score'),
    document.getElementById('risk-score-value'),
    document.getElementById('risk-level-tag'),
    document.getElementById('direct-count'),
    document.getElementById('indirect-count'),
    document.getElementById('test-count')
  ];
  els.forEach(el => {
    if (!el) return;
    el.style.transition = 'background 0.15s, color 0.15s';
    el.style.background = 'rgba(20, 184, 166, 0.25)';
    setTimeout(() => { el.style.background = ''; }, 700);
  });
}

// Toast Notification System
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      display: flex; flex-direction: column; gap: 8px; pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const colors = {
    success: { bg: '#0d9488', border: '#14b8a6', icon: '✓' },
    error:   { bg: '#b91c1c', border: '#ef4444', icon: '✕' },
    info:    { bg: '#1d4ed8', border: '#3b82f6', icon: 'ℹ' }
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg}; border: 1px solid ${c.border}; color: #fff;
    padding: 10px 16px; border-radius: 6px; font-size: 0.82rem;
    font-family: var(--font-main, sans-serif); max-width: 340px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4); pointer-events: all;
    display: flex; align-items: center; gap: 10px;
    animation: toastSlideIn 0.25s ease;
  `;
  toast.innerHTML = `<span style="font-weight:700; font-size:1rem;">${c.icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Add keyframe if not already added
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes toastSlideIn { from { transform: translateX(110%); opacity:0; } to { transform: translateX(0); opacity:1; } }
      @keyframes toastFadeOut { from { opacity:1; } to { opacity:0; transform: translateY(8px); } }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spin-icon { animation: spin 0.9s linear infinite; }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.35s ease forwards';
    setTimeout(() => toast.remove(), 380);
  }, 3500);
}

// Render Impact Analysis Results & Metric Cards
function renderImpactSummary(data) {
  if (!data || data.error) return;

  const summary = data.summary;

  // Row 1 Metric Cards
  const statArtifact = document.getElementById('stat-artifact-count');
  if (statArtifact) statArtifact.textContent = summary.total_affected_artifacts;

  const statRisk = document.getElementById('stat-risk-level');
  if (statRisk) {
    statRisk.textContent = summary.risk_category;
    if (summary.risk_category === 'CRITICAL' || summary.risk_category === 'HIGH') {
      statRisk.style.color = 'var(--status-critical)';
    } else if (summary.risk_category === 'MEDIUM') {
      statRisk.style.color = 'var(--status-warning)';
    } else {
      statRisk.style.color = 'var(--status-success)';
    }
  }

  const statRiskSub = document.getElementById('stat-risk-subtitle');
  if (statRiskSub) {
    statRiskSub.textContent = summary.risk_score >= 70 ? 'Critical impact scope' : (summary.risk_score >= 35 ? 'Moderate impact scope' : 'Low impact scope');
  }

  const statScore = document.getElementById('stat-risk-score');
  if (statScore) {
    statScore.innerHTML = `${summary.risk_score} <span style="font-size: 0.8rem; color: var(--text-dim); font-weight: normal;">/ 100</span>`;
  }

  // Row 2 Risk Assessment Card
  const riskVal = document.getElementById('risk-score-value');
  if (riskVal) riskVal.textContent = `${summary.risk_score} / 100`;

  const riskTag = document.getElementById('risk-level-tag');
  if (riskTag) {
    riskTag.textContent = summary.risk_category;
    riskTag.className = `risk-level-tag tag-${summary.risk_category}`;
  }

  const riskAff = document.getElementById('risk-affected-summary');
  if (riskAff) riskAff.textContent = `${summary.total_affected_artifacts} affected artifacts`;

  const riskRec = document.getElementById('risk-recommendation');
  if (riskRec) {
    if (data.change_description) {
      riskRec.innerHTML = `<span style="display:inline-block; color: var(--accent-teal); font-weight:600; margin-bottom:4px;">Proposed: "${data.change_description}" (${data.change_severity})</span><br>${summary.recommendation}`;
    } else {
      riskRec.textContent = summary.recommendation;
    }
  }

  // Lists & Summary Counters
  const totalImpacts = (summary.direct_impact_count || 0) + (summary.indirect_impact_count || 0);

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('direct-count', summary.direct_impact_count);
  setText('direct-btn-count', summary.direct_impact_count);
  setText('direct-count-summary', summary.direct_impact_count);

  setText('indirect-count', summary.indirect_impact_count);
  setText('indirect-btn-count', summary.indirect_impact_count);
  setText('indirect-count-summary', summary.indirect_impact_count);

  setText('summary-total-impacts', totalImpacts);
  setText('impact-total-badge', `${totalImpacts} Total`);

  const directList = document.getElementById('direct-impact-list');
  if (directList) {
    directList.innerHTML = (data.direct_impacts || []).map(item => `
      <li class="impact-item-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span class="badge badge-${item.type}">${item.type}</span>
            <span class="mono-code" style="font-size: 0.73rem; font-weight: 700; color: var(--accent-blue);">${item.id}</span>
          </div>
          <span style="font-size: 0.65rem; color: var(--status-critical); background: rgba(239, 68, 68, 0.15); padding: 1px 5px; border-radius: 3px; font-weight: 700;">HOP 1</span>
        </div>
        <div style="color: var(--text-main); font-size: 0.74rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;" title="${item.name}">${item.name}</div>
      </li>
    `).join('') || '<li style="color: var(--text-dim); font-size: 0.75rem; padding: 10px 0;">No direct code impacts.</li>';
  }

  const indirectList = document.getElementById('indirect-impact-list');
  if (indirectList) {
    indirectList.innerHTML = (data.indirect_impacts || []).map(item => `
      <li class="impact-item-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span class="badge badge-${item.type}">${item.type}</span>
            <span class="mono-code" style="font-size: 0.73rem; font-weight: 700; color: var(--accent-blue);">${item.id}</span>
          </div>
          <span style="font-size: 0.65rem; color: var(--accent-cyan); background: rgba(8, 145, 178, 0.15); padding: 1px 5px; border-radius: 3px; font-weight: 700;">HOP ${item.distance || 2}</span>
        </div>
        <div style="color: var(--text-main); font-size: 0.74rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;" title="${item.name}">${item.name}</div>
      </li>
    `).join('') || '<li style="color: var(--text-dim); font-size: 0.75rem; padding: 10px 0;">No indirect ripple impacts.</li>';
  }

  // Render Smart Test Pruning (Dynamic Test Selection & Optimization)
  renderTestPruning(data.test_pruning);

  // Render Requirement Propagation Cascade Walkthrough
  renderReqPropagationCascade(data.req_propagation_steps || []);

  // Draw Graph based on current mode
  renderCurrentGraphView();

  // Populate and show the result banner inside the simulator card
  const banner = document.getElementById('impact-result-banner');
  if (banner) {
    banner.style.display = 'block';
    const riskCatColors = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e' };
    const bannerRisk = document.getElementById('banner-risk-cat');
    if (bannerRisk) {
      bannerRisk.textContent = summary.risk_category;
      bannerRisk.style.color = riskCatColors[summary.risk_category] || '#ef4444';
    }
    const bannerScore = document.getElementById('banner-risk-score');
    if (bannerScore) bannerScore.textContent = `${summary.risk_score} / 100`;
    const bannerAff = document.getElementById('banner-affected');
    if (bannerAff) bannerAff.textContent = `${summary.total_affected_artifacts} artifacts (${summary.affected_requirement_count || 0} reqs)`;
  }
}

// Toggle between Split View (side-by-side), Direct Only, and Indirect Only
function switchImpactView(view) {
  const container = document.getElementById('impacts-split-container');
  const panelDirect = document.getElementById('panel-direct-impacts');
  const panelIndirect = document.getElementById('panel-indirect-impacts');
  const btnBoth = document.getElementById('btn-impact-view-both');
  const btnDirect = document.getElementById('btn-impact-view-direct');
  const btnIndirect = document.getElementById('btn-impact-view-indirect');

  if (!container || !panelDirect || !panelIndirect) return;

  btnBoth?.classList.toggle('active', view === 'both');
  btnDirect?.classList.toggle('active', view === 'direct');
  btnIndirect?.classList.toggle('active', view === 'indirect');

  if (view === 'direct') {
    container.style.gridTemplateColumns = '1fr';
    panelDirect.style.display = 'flex';
    panelIndirect.style.display = 'none';
  } else if (view === 'indirect') {
    container.style.gridTemplateColumns = '1fr';
    panelDirect.style.display = 'none';
    panelIndirect.style.display = 'flex';
  } else {
    container.style.gridTemplateColumns = '1fr 1fr';
    panelDirect.style.display = 'flex';
    panelIndirect.style.display = 'flex';
  }
}

// ── Smart Test Pruning & Dynamic Test Suite Selection ──
let lastTestPruningData = null;

function renderTestPruning(pruning) {
  if (!pruning) return;
  lastTestPruningData = pruning;

  const effBadge = document.getElementById('test-efficiency-badge');
  if (effBadge) {
    effBadge.textContent = `⚡ ${pruning.time_saved_percent}% Time Saved (${pruning.efficiency_gain})`;
  }

  const testCountBadge = document.getElementById('test-count');
  if (testCountBadge) {
    testCountBadge.textContent = `${pruning.selected_test_suites_count} MUST RUN (${pruning.selected_test_cases} tests)`;
  }

  const durationStat = document.getElementById('pruning-duration-stat');
  if (durationStat) {
    durationStat.textContent = `${pruning.pruned_suite_duration_sec}s vs ${pruning.full_suite_duration_sec}s full (${pruning.time_saved_sec}s saved)`;
  }

  const skippedStat = document.getElementById('pruning-skipped-stat');
  if (skippedStat) {
    skippedStat.textContent = `${pruning.skipped_test_suites_count} Suites (${pruning.skipped_test_cases} tests pruned)`;
  }

  updatePruningListView();
  renderFullPruningWorkspace(pruning);
}

function switchPruningView(view) {
  currentPruningView = view;
  document.getElementById('btn-prune-selected')?.classList.toggle('active', view === 'selected');
  document.getElementById('btn-prune-skipped')?.classList.toggle('active', view === 'skipped');
  updatePruningListView();
}

function updatePruningListView() {
  if (!lastTestPruningData) return;
  const listEl = document.getElementById('test-impact-list');
  if (!listEl) return;

  const isSelected = currentPruningView === 'selected';
  const tests = isSelected ? lastTestPruningData.selected_tests : lastTestPruningData.skipped_tests;

  if (!tests || tests.length === 0) {
    listEl.innerHTML = `<li style="color:var(--text-dim); padding:10px 0; font-size:0.75rem;">No ${isSelected ? 'selected' : 'pruned'} test suites for this change.</li>`;
    return;
  }

  listEl.innerHTML = tests.map(t => {
    const badgeStyle = isSelected
      ? 'background:rgba(239, 68, 68, 0.15); color:var(--status-critical); border:1px solid rgba(239, 68, 68, 0.4);'
      : 'background:rgba(34, 197, 94, 0.15); color:var(--status-success); border:1px solid rgba(34, 197, 94, 0.4);';
    const tagText = isSelected ? 'MUST RUN' : 'SAFELY PRUNED';

    return `
      <li style="margin-bottom: 6px; padding: 6px 8px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge badge-TEST">TEST</span>
            <strong style="color: var(--text-heading); font-size: 0.78rem;">${t.id}: ${t.name}</strong>
          </div>
          <span class="badge" style="${badgeStyle}; font-size:0.65rem;">${tagText}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 0.7rem; color: var(--text-muted); margin-top:2px;">
          <span style="font-family: var(--font-mono); color: var(--accent-blue);">${t.path}</span>
          <span style="font-family: var(--font-mono);">${t.test_count} tests · ${t.duration_sec}s</span>
        </div>
        <div style="font-size: 0.68rem; color: ${isSelected ? 'var(--status-warning)' : 'var(--text-dim)'}; margin-top: 2px;">
          ${isSelected ? '⚡ ' + t.selection_reason : '✂️ ' + t.skip_reason}
        </div>
      </li>
    `;
  }).join('');
}

// Populate the full-tab Smart Test Pruning workspace
function renderFullPruningWorkspace(pruning) {
  if (!pruning) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('full-prune-saved-pct', `${pruning.time_saved_percent}%`);
  set('full-prune-speedup', pruning.efficiency_gain);
  set('full-prune-duration', `${pruning.pruned_suite_duration_sec}s`);
  set('full-prune-saved-sec', `${pruning.time_saved_sec}s saved vs ${pruning.full_suite_duration_sec}s full`);
  set('full-prune-selected-count', pruning.selected_test_suites_count);
  set('full-prune-selected-tests', `${pruning.selected_test_cases} test cases`);
  set('full-prune-skipped-count', pruning.skipped_test_suites_count);
  set('full-prune-skipped-tests', `${pruning.skipped_test_cases} test cases`);

  // Must Run table
  const selBody = document.getElementById('full-selected-tests-body');
  if (selBody) {
    selBody.innerHTML = (pruning.selected_tests || []).map(t => `
      <tr>
        <td><span class="badge badge-TEST">${t.id}</span></td>
        <td>
          <div style="font-weight:600;color:var(--text-heading);font-size:0.82rem;">${t.name}</div>
          <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--accent-blue);">${t.path}</div>
        </td>
        <td style="text-align:center;font-family:var(--font-mono);">${t.test_count}</td>
        <td style="text-align:center;font-family:var(--font-mono);">${t.duration_sec}s</td>
        <td>
          <span style="background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.35);border-radius:4px;padding:2px 7px;font-size:0.7rem;font-weight:600;">MUST RUN</span>
          <div style="font-size:0.7rem;color:var(--status-warning);margin-top:3px;">⚡ ${t.selection_reason}</div>
        </td>
      </tr>`).join('');
  }

  // Safely Pruned table
  const skipBody = document.getElementById('full-skipped-tests-body');
  if (skipBody) {
    skipBody.innerHTML = (pruning.skipped_tests || []).map(t => `
      <tr>
        <td><span class="badge badge-TEST">${t.id}</span></td>
        <td>
          <div style="font-weight:600;color:var(--text-heading);font-size:0.82rem;">${t.name}</div>
          <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--accent-blue);">${t.path}</div>
        </td>
        <td style="text-align:center;font-family:var(--font-mono);">${t.test_count}</td>
        <td style="text-align:center;font-family:var(--font-mono);">${t.duration_sec}s</td>
        <td>
          <span style="background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.35);border-radius:4px;padding:2px 7px;font-size:0.7rem;font-weight:600;">SAFELY PRUNED</span>
          <div style="font-size:0.7rem;color:var(--text-dim);margin-top:3px;">✂️ ${t.skip_reason}</div>
        </td>
      </tr>`).join('');
  }
}

// Full-tab animated CI/CD runner
async function runFullTabPrunedCI() {
  if (!lastTestPruningData) {
    showToast('Run impact analysis first to load test data.', 'error');
    return;
  }

  const bar     = document.getElementById('full-ci-progress-bar');
  const pctLbl  = document.getElementById('full-ci-pct-label');
  const badge   = document.getElementById('full-ci-status-badge');
  const console_el = document.getElementById('full-ci-console');
  if (!bar || !console_el) return;

  // Reset UI
  bar.style.width = '0%';
  bar.style.background = 'var(--primary)';
  if (pctLbl) pctLbl.textContent = '0%';
  if (badge) { badge.textContent = 'RUNNING'; badge.style.background = 'rgba(234,179,8,0.2)'; badge.style.color = '#eab308'; }
  console_el.innerHTML = '';

  const log = (msg, color) => {
    const ts = new Date().toISOString().substr(11, 8);
    console_el.innerHTML += `<div style="color:${color || 'var(--text-muted)'};"><span style="color:var(--text-dim);">[${ts}]</span> ${msg}</div>`;
    console_el.scrollTop = console_el.scrollHeight;
  };

  const p = lastTestPruningData;
  log(`🚀 Smart Pruned CI Pipeline started for <strong style="color:var(--accent-blue);">${currentImpactResult ? currentImpactResult.target_req : 'Requirement'}</strong>`);
  await new Promise(r => setTimeout(r, 350));
  log(`📋 Total repo suites: <strong>${p.total_test_suites_in_repo}</strong> &nbsp;|&nbsp; Selected: <strong style="color:#ef4444;">${p.selected_test_suites_count}</strong> &nbsp;|&nbsp; Pruned: <strong style="color:#22c55e;">${p.skipped_test_suites_count}</strong>`);
  await new Promise(r => setTimeout(r, 300));
  log(`✂️  Skipping <strong>${p.skipped_test_suites_count}</strong> irrelevant suites (<strong>${p.skipped_test_cases}</strong> tests safely omitted)`);
  await new Promise(r => setTimeout(r, 300));
  log(`⚡ Executing <strong>${p.selected_test_suites_count}</strong> targeted suites (<strong>${p.selected_test_cases}</strong> tests)...`);

  const setProgress = pct => {
    bar.style.width = `${pct}%`;
    if (pctLbl) pctLbl.textContent = `${pct}%`;
  };

  setProgress(10);

  const selected = p.selected_tests || [];
  for (let i = 0; i < selected.length; i++) {
    const t = selected[i];
    await new Promise(r => setTimeout(r, 650));
    const pct = Math.round(10 + ((i + 1) / selected.length) * 82);
    setProgress(pct);
    const sim_ms = (t.duration_sec * 100).toFixed(0);
    log(`  ▶ <span style="color:var(--accent-blue);font-family:var(--font-mono);">${t.id}</span> — ${t.name} &nbsp;<span style="font-family:var(--font-mono);font-size:0.75em;color:var(--text-dim);">(${t.test_count} tests)</span>&nbsp;&nbsp;<strong style="color:#22c55e;">✔ PASS</strong> <span style="color:var(--text-dim);">${sim_ms}ms</span>`);
  }

  await new Promise(r => setTimeout(r, 400));
  setProgress(100);
  bar.style.background = '#22c55e';
  if (pctLbl) pctLbl.textContent = '100%';
  if (badge) { badge.textContent = 'ALL PASSED'; badge.style.background = 'rgba(34,197,94,0.2)'; badge.style.color = '#22c55e'; }

  log(`<br><strong style="color:#22c55e;font-size:1em;">✅ SUCCESS — All ${p.selected_test_cases} tests passed in ${p.pruned_suite_duration_sec}s!</strong>`);
  log(`<strong style="color:var(--accent-blue);">💡 Smart Pruning saved ${p.time_saved_sec}s (${p.time_saved_percent}%) — ${p.efficiency_gain} faster than full suite.</strong>`);
  showToast(`✅ Full CI Pipeline Passed! ${p.time_saved_percent}% time saved (${p.efficiency_gain})`, 'success');
}

// Live Simulated Pruned CI/CD Pipeline Runner
async function runSimulatedPrunedCI() {
  if (!lastTestPruningData) {
    showToast('Please run impact analysis first.', 'error');
    return;
  }

  const runner = document.getElementById('ci-live-runner');
  const bar = document.getElementById('ci-progress-bar');
  const status = document.getElementById('ci-progress-status');
  const log = document.getElementById('ci-console-log');
  if (!runner || !bar || !status || !log) return;

  runner.style.display = 'block';
  bar.style.width = '0%';
  bar.style.background = 'var(--primary)';
  status.textContent = 'Initializing Smart Test Runner...';
  status.style.color = 'var(--status-warning)';
  log.innerHTML = `[Bazaar SCM] Generating smart execution manifest for '${currentImpactResult.target_req}'...<br>`;

  const selected = lastTestPruningData.selected_tests;
  const skippedCount = lastTestPruningData.skipped_test_suites_count;
  const skippedTests = lastTestPruningData.skipped_test_cases;

  await new Promise(r => setTimeout(r, 400));
  log.innerHTML += `[Smart Pruner] Skipped ${skippedCount} irrelevant test suites (${skippedTests} test cases safely omitted).<br>`;
  log.innerHTML += `[Smart Pruner] Executing ${selected.length} targeted test suites (${lastTestPruningData.selected_test_cases} tests)...<br>`;
  bar.style.width = '15%';

  for (let i = 0; i < selected.length; i++) {
    const t = selected[i];
    await new Promise(r => setTimeout(r, 600));
    const pct = Math.round(15 + ((i + 1) / selected.length) * 80);
    bar.style.width = `${pct}%`;
    log.innerHTML += `[RUNNER] Running ${t.id} (${t.test_count} tests)... <span style="color:#22c55e;">✔ PASS</span> (${(t.duration_sec * 0.1).toFixed(1)}s)<br>`;
    log.scrollTop = log.scrollHeight;
  }

  await new Promise(r => setTimeout(r, 300));
  bar.style.width = '100%';
  bar.style.background = '#22c55e';
  status.textContent = 'PASSED';
  status.style.color = '#22c55e';
  log.innerHTML += `<strong style="color:#22c55e;">[SUCCESS] All ${lastTestPruningData.selected_test_cases} pruned tests passed! Execution completed in ${lastTestPruningData.pruned_suite_duration_sec}s (Saved ${lastTestPruningData.time_saved_sec}s / ${lastTestPruningData.time_saved_percent}% vs full suite).</strong><br>`;
  log.scrollTop = log.scrollHeight;
  showToast(`✓ Smart Pruned CI Pipeline Passed in ${lastTestPruningData.pruned_suite_duration_sec}s! (${lastTestPruningData.time_saved_percent}% time saved)`, 'success');
}

// Switch between 'req' (Requirement Dependency Flow) and 'full' (Full System Traceability)
function setGraphMode(mode) {
  currentGraphMode = mode;
  document.getElementById('btn-view-req')?.classList.toggle('active', mode === 'req');
  document.getElementById('btn-view-full')?.classList.toggle('active', mode === 'full');

  const titleEl = document.getElementById('graph-header-title');
  if (titleEl) {
    titleEl.textContent = mode === 'req' ? 'Requirement Dependency Graph' : 'Full Artifact Traceability Graph';
  }

  const legendOrigin = document.getElementById('legend-origin-label');
  const legendDirect = document.getElementById('legend-direct-label');
  const legendIndirect = document.getElementById('legend-indirect-label');
  if (mode === 'req') {
    if (legendOrigin) legendOrigin.textContent = 'Changed Req (Origin)';
    if (legendDirect) legendDirect.textContent = 'Direct Req Ripple (Hop 1)';
    if (legendIndirect) legendIndirect.textContent = 'Downstream Ripple (Hop 2+)';
  } else {
    if (legendOrigin) legendOrigin.textContent = 'Target Node';
    if (legendDirect) legendDirect.textContent = 'Direct Artifact Impact';
    if (legendIndirect) legendIndirect.textContent = 'Indirect Artifact Impact';
  }

  renderCurrentGraphView();
}

function renderCurrentGraphView() {
  if (!currentImpactResult) return;
  if (currentGraphMode === 'req' && currentImpactResult.req_graph) {
    drawRequirementDependencyGraph(currentImpactResult.req_graph, currentImpactResult.target_req);
  } else {
    drawFullTraceabilityGraph(currentImpactResult.graph);
  }
}

// Render Requirement Change Propagation Cascade Timeline
function renderReqPropagationCascade(steps) {
  const container = document.getElementById('req-propagation-timeline');
  const badge = document.getElementById('propagation-summary-badge');
  if (!container) return;

  const affectedSteps = steps.filter(s => s.hop > 0);
  if (badge) {
    badge.textContent = `${affectedSteps.length} Downstream Requirements Affected`;
  }

  if (!steps || steps.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim); font-size:0.78rem;">No requirement propagation steps detected.</div>';
    return;
  }

  container.innerHTML = steps.map((s, idx) => {
    const hopClass = `hop-${Math.min(3, s.hop)}`;
    const hopLabel = s.hop === 0 ? 'ORIGIN' : (s.hop === 1 ? 'HOP 1 · DIRECT' : `HOP ${s.hop} · RIPPLE`);
    return `
      <div class="propagation-step ${s.hop === 0 ? 'active-step' : ''}" id="prop-step-${idx}">
        <span class="propagation-hop-badge ${hopClass}">${hopLabel}</span>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px;">
            <strong style="color:var(--text-main); font-size:0.8rem;">${s.requirement_id}: ${s.requirement_name}</strong>
            <span class="propagation-link-tag">${s.propagation_type}</span>
          </div>
          <div style="font-size:0.74rem; color:var(--text-muted);">${s.impact_reason}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Interactive Requirement-to-Requirement Dependency Graph Canvas ──
function drawRequirementDependencyGraph(reqGraph, targetReqId) {
  const canvas = document.getElementById('graph-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 420;
  ctx.clearRect(0, 0, width, height);

  if (!reqGraph || !reqGraph.nodes || reqGraph.nodes.length === 0) return;

  // Group nodes by propagation distance/tier
  // Tier 0: Origin (Target Req)
  // Tier 1: Direct Impacts (distance == 1)
  // Tier 2: Indirect Impacts (distance == 2)
  // Tier 3: Further Downstream (distance >= 3 or distance == -1 / unaffected)
  const originNode = reqGraph.nodes.find(n => n.is_target);
  const hop1Nodes = reqGraph.nodes.filter(n => !n.is_target && n.distance === 1);
  const hop2Nodes = reqGraph.nodes.filter(n => !n.is_target && n.distance === 2);
  const downstreamNodes = reqGraph.nodes.filter(n => !n.is_target && (n.distance >= 3 || n.distance === -1));

  const nodePositions = {};
  const tiers = [
    { nodes: originNode ? [originNode] : [], x: width * 0.16 },
    { nodes: hop1Nodes, x: width * 0.42 },
    { nodes: hop2Nodes, x: width * 0.68 },
    { nodes: downstreamNodes, x: width * 0.90 }
  ];

  tiers.forEach(tier => {
    const count = tier.nodes.length;
    tier.nodes.forEach((n, idx) => {
      const stepY = height / (count + 1);
      const y = stepY * (idx + 1);
      nodePositions[n.id] = { x: tier.x, y, node: n };
    });
  });

  // Draw Requirement-to-Requirement Directed Edges with Labels
  reqGraph.edges.forEach(edge => {
    const src = nodePositions[edge.source];
    const tgt = nodePositions[edge.target];
    if (src && tgt) {
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (edge.is_active_propagation) {
        ctx.strokeStyle = '#14b8a6'; // Active propagation flow
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw arrow head pointing toward dependent / ripple direction
      const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
      const arrowRadius = 26;
      const arrowX = tgt.x - arrowRadius * Math.cos(angle);
      const arrowY = tgt.y - arrowRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 8 * Math.cos(angle - Math.PI / 6), arrowY - 8 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(arrowX - 8 * Math.cos(angle + Math.PI / 6), arrowY - 8 * Math.sin(angle + Math.PI / 6));
      ctx.fillStyle = edge.is_active_propagation ? '#14b8a6' : 'rgba(148, 163, 184, 0.4)';
      ctx.fill();

      // Draw Relationship Label at midpoint
      const midX = (src.x + tgt.x) / 2;
      const midY = (src.y + tgt.y) / 2 - 8;
      ctx.font = 'bold 9px var(--font-mono, monospace)';
      ctx.fillStyle = edge.is_active_propagation ? '#2dd4bf' : '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(edge.label, midX, midY);
    }
  });

  // Draw Requirement Nodes
  const isLight = document.body.classList.contains('theme-light');
  Object.values(nodePositions).forEach(item => {
    const { x, y, node } = item;
    const isTarget = node.is_target;
    const dist = node.distance;

    ctx.beginPath();
    ctx.arc(x, y, isTarget ? 22 : 18, 0, 2 * Math.PI);

    if (isTarget) {
      ctx.fillStyle = '#ef4444'; // Red for changed origin requirement
    } else if (dist === 1) {
      ctx.fillStyle = '#f59e0b'; // Amber for direct 1st-hop affected requirement
    } else if (dist >= 2) {
      ctx.fillStyle = '#0891b2'; // Cyan/Teal for 2nd/3rd-hop affected requirements
    } else {
      ctx.fillStyle = '#334155'; // Slate for unaffected
    }
    ctx.fill();

    ctx.lineWidth = isTarget ? 3 : 2;
    ctx.strokeStyle = isLight ? '#ffffff' : '#0f172a';
    ctx.stroke();

    // Node ID text inside/under node
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.id.replace('REQ-', 'R'), x, y);

    // Node Title & Hop Badge under node
    ctx.textBaseline = 'top';
    ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(node.id, x, y + 24);

    ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
    ctx.font = '9px Inter, sans-serif';
    const shortName = (node.name || '').substring(0, 18);
    ctx.fillText(shortName, x, y + 36);

    // Hop badge
    const badgeText = isTarget ? 'ORIGIN' : (dist === 1 ? 'HOP 1 · DIRECT' : (dist >= 2 ? `HOP ${dist}` : 'UNAFFECTED'));
    ctx.fillStyle = isTarget ? '#ef4444' : (dist === 1 ? '#f59e0b' : (dist >= 2 ? '#38bdf8' : '#64748b'));
    ctx.font = 'bold 8px var(--font-mono, monospace)';
    ctx.fillText(badgeText, x, y + 49);
  });
}

// ── Full System Traceability Canvas Graph ──
function drawFullTraceabilityGraph(graphData) {
  const canvas = document.getElementById('graph-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 420;
  ctx.clearRect(0, 0, width, height);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;

  const centerX = width / 2;
  const centerY = height / 2;

  const targetNode = graphData.nodes.find(n => n.is_target);
  const directNodes = graphData.nodes.filter(n => n.distance === 1);
  const indirectNodes = graphData.nodes.filter(n => n.distance > 1);

  const nodePositions = {};
  if (targetNode) {
    nodePositions[targetNode.id] = { x: centerX, y: centerY, node: targetNode };
  }

  const radius1X = Math.min(centerX - 60, Math.max(140, width * 0.22));
  const radius1Y = Math.min(centerY - 40, 110);
  directNodes.forEach((n, idx) => {
    const angle = (idx / Math.max(1, directNodes.length)) * 2 * Math.PI;
    const x = centerX + radius1X * Math.cos(angle);
    const y = centerY + radius1Y * Math.sin(angle);
    nodePositions[n.id] = { x, y, node: n };
  });

  const radius2X = Math.min(centerX - 40, Math.max(260, width * 0.38));
  const radius2Y = Math.min(centerY - 30, 170);
  indirectNodes.forEach((n, idx) => {
    const angle = (idx / Math.max(1, indirectNodes.length)) * 2 * Math.PI + 0.3;
    const x = centerX + radius2X * Math.cos(angle);
    const y = centerY + radius2Y * Math.sin(angle);
    nodePositions[n.id] = { x, y, node: n };
  });

  graphData.edges.forEach(edge => {
    const src = nodePositions[edge.source];
    const tgt = nodePositions[edge.target];
    if (src && tgt) {
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  const isLight = document.body.classList.contains('theme-light');
  Object.values(nodePositions).forEach(item => {
    const { x, y, node } = item;
    const isTarget = node.is_target;

    ctx.beginPath();
    ctx.arc(x, y, isTarget ? 20 : 14, 0, 2 * Math.PI);

    if (isTarget) {
      ctx.fillStyle = '#ef4444';
    } else if (node.distance === 1) {
      ctx.fillStyle = '#f59e0b';
    } else {
      ctx.fillStyle = '#0891b2';
    }

    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isLight ? '#ffffff' : '#182230';
    ctx.stroke();

    ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
    ctx.font = isTarget ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.id, x, y + (isTarget ? 32 : 24));
  });
}

function drawGraph(graphData) {
  renderCurrentGraphView();
}

// ── Automated Showcase Walkthrough Demonstration ──
async function runReqPropagationShowcase() {
  // Switch to Req mode
  setGraphMode('req');

  // Select REQ-101
  const selectReq = document.getElementById('select-req');
  if (selectReq) selectReq.value = 'REQ-101';

  const sevEl = document.getElementById('change-severity');
  if (sevEl) sevEl.value = 'HIGH';

  const descEl = document.getElementById('change-description');
  if (descEl) descEl.value = 'Refactoring User Authentication Token & Session Schema (Showcase Demo)';

  showToast('🚀 Running Requirement-to-Requirement Propagation Showcase...', 'info');

  await runImpactAnalysis();

  // Highlight step cards sequentially for visual walkthrough
  const steps = document.querySelectorAll('.propagation-step');
  steps.forEach((st, i) => {
    setTimeout(() => {
      st.style.transition = 'all 0.3s ease';
      st.style.transform = 'translateX(6px)';
      st.style.borderColor = 'var(--primary)';
      st.style.background = 'rgba(20, 184, 166, 0.15)';
      setTimeout(() => {
        st.style.transform = 'none';
        st.style.background = '';
      }, 700);
    }, i * 400);
  });
}

function setupCanvasResize() {
  window.addEventListener('resize', () => {
    if (currentImpactResult && document.getElementById('impact-tab')?.classList.contains('active')) {
      renderCurrentGraphView();
    }
  });
}

// Render Requirement Baseline Table
function renderRequirementTable() {
  const tbody = document.getElementById('req-table-body');
  if (!tbody) return;

  tbody.innerHTML = currentRequirements.map(req => `
    <tr>
      <td><strong>${req.id}</strong></td>
      <td>${req.title}</td>
      <td><span class="badge badge-REQUIREMENT">${req.priority}</span></td>
      <td>v${req.version}</td>
      <td><span style="color: #34d399; font-weight: 600;">${req.status}</span></td>
    </tr>
  `).join('');
}

// Render Traceability Matrix Table
function renderTraceabilityMatrix() {
  const tbody = document.getElementById('rtm-body');
  if (!tbody) return;

  tbody.innerHTML = currentRequirements.map(req => {
    // Find linked artifacts
    const reqLinks = currentTraceLinks.filter(l => l.source === req.id || l.target === req.id);
    const linkedIds = reqLinks.map(l => l.source === req.id ? l.target : l.source);

    const arch = linkedIds.filter(id => typeof id === 'string' && id.startsWith('ARCH-')).join(', ') || 'N/A';
    const code = linkedIds.filter(id => id.includes('CODE')).join(', ') || 'N/A';
    const db = linkedIds.filter(id => id.includes('DB')).join(', ') || 'N/A';
    const test = linkedIds.filter(id => id.includes('TEST')).join(', ') || 'N/A';

    return `
      <tr>
        <td><strong>${req.id}</strong></td>
        <td>${req.title}</td>
        <td><span class="badge badge-DESIGN">${arch}</span></td>
        <td><span class="badge badge-CODE">${code}</span></td>
        <td><span class="badge badge-DATABASE">${db}</span></td>
        <td><span class="badge badge-TEST">${test}</span></td>
      </tr>
    `;
  }).join('');
}

// Requirement Edit Form Commit to Bazaar SCM
async function handleReqCommit(e) {
  e.preventDefault();
  const payload = {
    id: document.getElementById('edit-req-id').value,
    title: document.getElementById('edit-title').value,
    description: document.getElementById('edit-desc').value,
    priority: document.getElementById('edit-priority').value,
    commit_message: document.getElementById('commit-msg').value,
    author: document.getElementById('commit-author').value
  };

  try {
    const res = await fetch('/api/requirements/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    alert(`Bazaar SCM Commit Successful!\nRevision: ${result.bazaar_commit.revision_number}\nMessage: ${result.bazaar_commit.message}`);
    fetchInitialData();
    switchTab('impact-tab');
  } catch (err) {
    alert("Commit failed: " + err.message);
  }
}

// Render Bazaar SCM Audit Logs
function renderScmLogs() {
  const tbody = document.getElementById('scm-log-body');
  if (!tbody) return;

  tbody.innerHTML = currentScmLog.map(log => `
    <tr>
      <td><strong style="color: #67e8f9;">${log.revision_number}</strong></td>
      <td><span class="badge badge-CODE">${log.branch || 'main'}</span></td>
      <td>${log.timestamp}</td>
      <td>${log.author}</td>
      <td>${log.message}</td>
      <td>
        <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="inspectRevision('${log.rev_id}')">
          View Snapshot
        </button>
      </td>
    </tr>
  `).join('');
}

function renderBranchInfo() {
  const currentBranch = currentBranches.find(b => b.is_current);
  if (currentBranch) {
    document.getElementById('active-branch-name').textContent = currentBranch.name;
  }
}

// Render Recent SCM Activity in Dashboard Row 3
function renderRecentScmActivity() {
  const tbody = document.getElementById('recent-scm-body');
  if (!tbody || !currentScmLog) return;
  const recent = currentScmLog.slice(0, 5);
  tbody.innerHTML = recent.map(c => {
    const dateStr = c.timestamp ? (c.timestamp.includes('T') ? c.timestamp.split('T')[0] : c.timestamp) : 'Recent';
    return `
      <tr>
        <td><span class="mono-code" style="color: var(--accent-teal); font-size: 0.75rem; font-weight: 600;">r${c.revision_number}</span></td>
        <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.message}">${c.message}</td>
        <td style="font-size: 0.72rem; color: var(--text-dim);">${dateStr}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="3" style="color: var(--text-muted); text-align: center;">No SCM commits found</td></tr>';
}

// Render Repository Status in Dashboard Row 3
function renderRepoStatus() {
  const revEl = document.getElementById('repo-status-rev');
  const branchEl = document.getElementById('repo-status-branch');
  const timeEl = document.getElementById('repo-status-time');
  
  if (currentScmLog && currentScmLog.length > 0) {
    const latest = currentScmLog[0];
    if (revEl) revEl.textContent = `r${latest.revision_number}`;
    if (timeEl) {
      const ts = latest.timestamp || '';
      timeEl.textContent = ts.includes('T') ? ts.replace('T', ' ').substring(0, 16) : (ts || 'Just now');
    }
  }
  if (currentBranches && currentBranches.length > 0) {
    const active = currentBranches.find(b => b.is_current) || currentBranches[0];
    if (branchEl) branchEl.textContent = active.name || 'main';
  }
}

async function handleCreateBranch() {
  const branchName = document.getElementById('new-branch-input')?.value.trim();
  if (!branchName) return;

  try {
    const res = await fetch('/api/scm/branch/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_name: branchName })
    });
    const result = await res.json();
    alert(result.message);
    fetchInitialData();
  } catch (err) {
    alert("Failed to create branch: " + err.message);
  }
}

// Diff Selectors Loader
function populateDiffSelectors() {
  const selA = document.getElementById('diff-rev-a');
  const selB = document.getElementById('diff-rev-b');
  if (!selA || !selB) return;

  selA.innerHTML = '';
  selB.innerHTML = '';

  currentScmLog.forEach(log => {
    const optA = document.createElement('option');
    optA.value = log.rev_id;
    optA.textContent = log.revision_number;
    selA.appendChild(optA);

    const optB = document.createElement('option');
    optB.value = log.rev_id;
    optB.textContent = log.revision_number;
    selB.appendChild(optB);
  });

  if (currentScmLog.length >= 2) {
    selA.value = currentScmLog[currentScmLog.length - 1].rev_id;
    selB.value = currentScmLog[0].rev_id;
    loadDiff();
  }
}

async function loadDiff() {
  const revA = document.getElementById('diff-rev-a')?.value;
  const revB = document.getElementById('diff-rev-b')?.value;
  const diffBox = document.getElementById('diff-output');
  if (!revA || !revB || !diffBox) return;

  try {
    const res = await fetch(`/api/scm/diff?rev_a=${revA}&rev_b=${revB}`);
    const data = await res.json();

    if (data.unified_diff && data.unified_diff.length > 0) {
      diffBox.innerHTML = data.unified_diff.map(line => {
        if (line.startsWith('+')) return `<span class="diff-add">${escapeHtml(line)}</span>`;
        if (line.startsWith('-')) return `<span class="diff-del">${escapeHtml(line)}</span>`;
        if (line.startsWith('---') || line.startsWith('+++')) return `<span class="diff-header">${escapeHtml(line)}</span>`;
        return escapeHtml(line);
      }).join('\n');
    } else {
      diffBox.textContent = "No text differences detected between these two revisions.";
    }
  } catch (err) {
    diffBox.textContent = "Failed to load diff: " + err.message;
  }
}

// Generate Review 2 Presentation Report
function generateReportView() {
  document.getElementById('report-date').textContent = `Generated on: ${new Date().toLocaleString()}`;
  
  if (currentImpactResult) {
    const s = currentImpactResult.summary;
    document.getElementById('report-exec-summary').textContent = 
      `Automated Impact Analysis for Target Requirement '${currentImpactResult.target_req}' under proposed change: "${currentImpactResult.change_description || 'Requirement specification modification'}". Version tracking is maintained in Bazaar SCM.`;

    document.getElementById('report-risk-summary').className = `risk-indicator risk-${s.risk_category}`;
    document.getElementById('report-risk-summary').innerHTML = `
      <div>
        <h3>Risk Category: ${s.risk_category} | Score: ${s.risk_score}/100</h3>
        <p>${s.recommendation}</p>
      </div>
    `;

    document.getElementById('report-artifacts-table').innerHTML = `
      <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">
        <thead>
          <tr style="background: #1e293b;">
            <th style="padding: 8px;">Artifact ID</th>
            <th style="padding: 8px;">Name</th>
            <th style="padding: 8px;">Type</th>
            <th style="padding: 8px;">Impact Hop</th>
          </tr>
        </thead>
        <tbody>
          ${[...currentImpactResult.direct_impacts, ...currentImpactResult.indirect_impacts].map(a => `
            <tr>
              <td style="padding: 8px;"><strong>${a.id}</strong></td>
              <td style="padding: 8px;">${a.name}</td>
              <td style="padding: 8px;">${a.type}</td>
              <td style="padding: 8px;">${a.impact_level} (Distance: ${a.distance})</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const scmLogEl = document.getElementById('report-scm-log');
  if (scmLogEl && currentScmLog) {
    scmLogEl.innerHTML = `
      <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse; margin-top: 8px;">
        <thead>
          <tr style="background: #1e293b;">
            <th style="padding: 8px; text-align: left;">Revision</th>
            <th style="padding: 8px; text-align: left;">Author</th>
            <th style="padding: 8px; text-align: left;">Message</th>
            <th style="padding: 8px; text-align: left;">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${currentScmLog.map(r => `
            <tr style="border-bottom: 1px solid var(--border-subtle, #334155);">
              <td style="padding: 8px;"><strong style="color: var(--accent-teal, #14b8a6);">r${r.revision_number}</strong></td>
              <td style="padding: 8px;">${escapeHtml(r.author || '')}</td>
              <td style="padding: 8px;">${escapeHtml(r.message || '')}</td>
              <td style="padding: 8px; font-size: 0.78rem; color: var(--text-dim, #94a3b8);">${r.timestamp || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

function inspectRevision(revId) {
  const rev = currentScmLog.find(r => r.rev_id == revId || r.revision_number == revId || r.revision_number == `r${revId}`);
  if (!rev) {
    alert(`Bazaar Revision '${revId}' not found.`);
    return;
  }

  document.getElementById('modal-rev-title').textContent = `Bazaar Revision Snapshot: ${rev.revision_number} (${rev.branch || 'main'})`;
  document.getElementById('modal-rev-meta').textContent = `Committed by ${rev.author} on ${rev.timestamp} | Message: "${rev.message}"`;

  const snapshot = rev.snapshot || [];
  const tbody = document.getElementById('modal-snapshot-table');
  if (tbody) {
    tbody.innerHTML = snapshot.map(req => `
      <tr>
        <td><strong>${req.id}</strong></td>
        <td>${req.title}</td>
        <td><span class="badge badge-REQUIREMENT">${req.priority}</span></td>
        <td>v${req.version}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(req.description || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">No requirements in this revision snapshot.</td></tr>';
  }

  const jsonPre = document.getElementById('modal-json-data');
  if (jsonPre) {
    jsonPre.textContent = JSON.stringify(snapshot, null, 2);
  }

  const modal = document.getElementById('snapshot-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeSnapshotModal() {
  const modal = document.getElementById('snapshot-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Project Requirement Dependencies Management ──
async function renderDependenciesTable() {
  const tbody = document.getElementById('deps-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/requirements/dependencies');
    const data = await res.json();
    const deps = data.dependencies || [];

    if (deps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-dim); text-align:center;">No requirement-to-requirement dependencies registered.</td></tr>';
      return;
    }

    tbody.innerHTML = deps.map(d => {
      const srcReq = currentRequirements.find(r => r.id === d.source);
      const tgtReq = currentRequirements.find(r => r.id === d.target);

      const srcTitle = srcReq ? srcReq.title : d.source;
      const tgtTitle = tgtReq ? tgtReq.title : d.target;

      return `
        <tr>
          <td>
            <strong>${d.source}</strong>: ${srcTitle}
          </td>
          <td>
            <span class="propagation-link-tag">${d.type}</span>
          </td>
          <td>
            <strong>${d.target}</strong>: ${tgtTitle}
          </td>
          <td>
            <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--status-warning); border: 1px solid rgba(245, 158, 11, 0.3);">
              Direct Ripple Hop
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Failed to render requirement dependencies table:", err);
  }
}

function populateDependencyDropdowns() {
  const srcSelect = document.getElementById('dep-source-req');
  const tgtSelect = document.getElementById('dep-target-req');
  if (!srcSelect || !tgtSelect) return;

  srcSelect.innerHTML = '';
  tgtSelect.innerHTML = '';

  currentRequirements.forEach(req => {
    const opt1 = document.createElement('option');
    opt1.value = req.id;
    opt1.textContent = `${req.id}: ${req.title}`;
    srcSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = req.id;
    opt2.textContent = `${req.id}: ${req.title}`;
    tgtSelect.appendChild(opt2);
  });

  if (currentRequirements.length > 1) {
    tgtSelect.selectedIndex = 1;
  }
}

async function handleAddRequirementDependency(e) {
  e.preventDefault();
  const source = document.getElementById('dep-source-req')?.value;
  const target = document.getElementById('dep-target-req')?.value;
  const type = document.getElementById('dep-rel-type')?.value;

  if (source === target) {
    alert("A requirement cannot depend on itself.");
    return;
  }

  try {
    const res = await fetch('/api/requirements/dependencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target, type })
    });
    const result = await res.json();
    if (result.error) {
      alert("Error: " + result.error);
      return;
    }

    showToast(`✓ Dependency ${source} -> ${target} (${type}) committed to Bazaar SCM!`, 'success');
    await fetchInitialData();
    switchTab('impact-tab');
  } catch (err) {
    alert("Failed to register dependency: " + err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// BAZAAR VS DARCS SCM COMPARISON TAB LOGIC
// ══════════════════════════════════════════════════════════════
let lastScmCompareData = null;

async function loadScmComparisonData() {
  try {
    const res = await fetch('/api/scm/compare');
    const data = await res.json();
    if (!data || data.error) return;
    lastScmCompareData = data;

    const bzrCount = data.bazaar.total_revisions || 0;
    const darcsCount = data.darcs.total_patches || 0;

    const repoStatus = document.getElementById('compare-repo-counts');
    if (repoStatus) repoStatus.textContent = `${bzrCount} Revisions vs ${darcsCount} Patches`;

    const repoSub = document.getElementById('compare-repo-counts-sub');
    if (repoSub) repoSub.textContent = `Bazaar: ${data.bazaar.storage_dir} · Darcs: ${data.darcs.storage_dir}`;

    const bzrCountBadge = document.getElementById('compare-bzr-count');
    if (bzrCountBadge) bzrCountBadge.textContent = `${bzrCount} Revisions`;

    const darcsCountBadge = document.getElementById('compare-darcs-count');
    if (darcsCountBadge) darcsCountBadge.textContent = `${darcsCount} Patches`;

    // Render Bazaar live list
    const bzrList = document.getElementById('compare-bzr-list');
    if (bzrList) {
      bzrList.innerHTML = (data.bazaar_log || []).map(r => `
        <div style="margin-bottom: 8px; padding: 8px 10px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); border-left: 3px solid var(--accent-blue);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="color: var(--accent-blue); font-family: var(--font-mono); font-size: 0.78rem;">r${r.revision_id}</strong>
            <span style="font-size: 0.68rem; color: var(--text-dim); font-family: var(--font-mono);">${r.timestamp || ''}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-main); font-weight: 500;">${r.message || ''}</div>
          <div style="display: flex; justify-content: space-between; align-size: 0.68rem; color: var(--text-muted); margin-top: 3px;">
            <span style="font-size:0.68rem;">Author: ${r.author || 'admin'}</span>
            <span class="badge" style="background: rgba(14, 165, 233, 0.1); color: var(--accent-blue); font-size: 0.62rem;">DAG Snapshot</span>
          </div>
        </div>
      `).join('') || '<div style="color:var(--text-dim);font-size:0.75rem;">No revisions found.</div>';
    }

    // Render Darcs live list
    const darcsList = document.getElementById('compare-darcs-list');
    if (darcsList) {
      darcsList.innerHTML = (data.darcs_log || []).map(p => `
        <div style="margin-bottom: 8px; padding: 8px 10px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); border-left: 3px solid var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 0.78rem;">${p.patch_id}</strong>
              <code style="font-size: 0.65rem; color: var(--text-dim); background: var(--bg-card); padding: 1px 4px; border-radius: 3px;">[${p.patch_hash}]</code>
            </span>
            <span style="font-size: 0.68rem; color: var(--text-dim); font-family: var(--font-mono);">${p.timestamp || ''}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-main); font-weight: 500;">${p.patch_name || ''}</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); margin-top: 3px;">
            <span>Target: <strong style="color: var(--accent-teal);">${p.changed_req_id || 'Baseline'}</strong></span>
            <span class="badge" style="background: rgba(6, 182, 212, 0.1); color: var(--accent-cyan); font-size: 0.62rem;">Algebraic Patch</span>
          </div>
        </div>
      `).join('') || '<div style="color:var(--text-dim);font-size:0.75rem;">No patches recorded yet.</div>';
    }

    // Populate Patch Commutation dropdowns
    const selectA = document.getElementById('select-patch-a');
    const selectB = document.getElementById('select-patch-b');
    const patches = data.darcs_log || [];

    if (selectA && selectB) {
      const optionsHtml = patches.map(p => 
        `<option value="${p.patch_id}">${p.patch_id} [${p.patch_hash}] - ${p.patch_name.substring(0, 40)} (${p.changed_req_id || 'Global'})</option>`
      ).join('');

      selectA.innerHTML = optionsHtml;
      selectB.innerHTML = optionsHtml;

      if (patches.length > 1) {
        selectB.selectedIndex = 1;
      }
    }
  } catch (err) {
    console.error("Failed to load SCM comparison data:", err);
  }
}

async function runDarcsCommuteTest() {
  const patchA = document.getElementById('select-patch-a')?.value;
  const patchB = document.getElementById('select-patch-b')?.value;

  if (!patchA || !patchB) {
    showToast("Please select two patches to commute.", "error");
    return;
  }

  try {
    const res = await fetch('/api/darcs/commute_demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch_a: patchA, patch_b: patchB })
    });
    const result = await res.json();
    if (result.error) {
      showToast("Error: " + result.error, "error");
      return;
    }

    const box = document.getElementById('commute-result-box');
    const eq = document.getElementById('commute-equation');
    const badge = document.getElementById('commute-status-badge');
    const expl = document.getElementById('commute-explanation');
    const adv = document.getElementById('commute-advantage');

    if (box) box.style.display = 'block';
    if (eq) eq.textContent = result.algebra_equation || '';
    if (badge) {
      badge.textContent = result.can_commute ? '✓ COMMUTES CLEANLY (0 CONFLICTS)' : '⚠ CONFLICT DETECTED';
      badge.style.background = result.can_commute ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      badge.style.color = result.can_commute ? 'var(--status-success)' : 'var(--status-critical)';
      badge.style.border = `1px solid ${result.can_commute ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`;
    }
    if (expl) expl.textContent = result.explanation || '';
    if (adv) adv.innerHTML = `<strong>Darcs vs. Bazaar Insight:</strong> ${result.darcs_advantage_over_bazaar || ''}`;

    showToast(result.can_commute ? "✓ Patches commute with 0 conflicts in Darcs!" : "⚠ Dependent patches detected.", result.can_commute ? "success" : "warning");
  } catch (err) {
    showToast("Commutation test failed: " + err.message, "error");
  }
}


