/**
 * Vouch Chrome Extension - Popup JS
 * Tab 1: Paste & Analyze
 * Tab 2: Scan Page
 * Tab 3: Site Credibility
 */

import { API_BASE_URL, API_TIMEOUT } from './config.js';

// ============================================
// STATE
// ============================================
let currentTab = 'paste';
let currentAnalysisResult = null;
let currentDomain = null;
let currentPageUrl = null;
let vouchScore = 0;
let analysisCount = 0;
let cachedSiteData = null;

// ============================================
// DOM ELEMENTS
// ============================================
const els = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),

  // Header
  vouchScore: document.getElementById('vouchScore'),
  settingsBtn: document.getElementById('settingsBtn'),

  // Tab 1 - Paste & Analyze
  claimInput: document.getElementById('claimInput'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  pasteLoading: document.getElementById('pasteLoading'),
  pasteResult: document.getElementById('pasteResult'),

  // Tab 2 - Scan Page
  scanDomain: document.getElementById('scanDomain'),
  rescanBtn: document.getElementById('rescanBtn'),
  scanningSection: document.getElementById('scanningSection'),
  claimsSection: document.getElementById('claimsSection'),
  scanEmptyState: document.getElementById('scanEmptyState'),
  claimResultSection: document.getElementById('claimResultSection'),

  // Tab 3 - Site Credibility
  siteFavicon: document.getElementById('siteFavicon'),
  siteDomainLabel: document.getElementById('siteDomainLabel'),
  refreshSiteBtn: document.getElementById('refreshSiteBtn'),
  siteLoading: document.getElementById('siteLoading'),
  siteResultSection: document.getElementById('siteResultSection'),

  // Footer
  historyCount: document.getElementById('historyCount'),
};

// ============================================
// INIT
// ============================================
async function init() {
  loadVouchScore();
  updateHistoryCount();
  setupEventListeners();
  switchTab('paste');

  // Check for pending text from context menu
  const { pendingText } = await chrome.storage.local.get('pendingText');
  if (pendingText) {
    els.claimInput.value = pendingText;
    await chrome.storage.local.remove('pendingText');
    await handleAnalyze();
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Tab switching
  els.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Paste & Analyze
  els.analyzeBtn.addEventListener('click', handleAnalyze);

  // Scan Page
  els.rescanBtn.addEventListener('click', handleScanPage);

  // Site Credibility
  els.refreshSiteBtn.addEventListener('click', handleRefreshSite);

  // Settings (placeholder)
  els.settingsBtn.addEventListener('click', () => {
    showToast('Settings coming soon');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey && currentTab === 'paste') {
      handleAnalyze();
    }
  });
}

// ============================================
// TAB SWITCHING
// ============================================
async function switchTab(tab) {
  currentTab = tab;

  els.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  els.tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tab}`);
  });

  if (tab === 'scan') {
    handleScanPage();
  } else if (tab === 'site') {
    handleSiteCredibility();
  }
}

// ============================================
// TAB 1: PASTE & ANALYZE
// ============================================
async function handleAnalyze() {
  const claim = els.claimInput.value.trim();
  if (!claim) {
    els.claimInput.focus();
    return;
  }

  const pageContext = await getActivePageContext();
  currentDomain = pageContext.domain;
  currentPageUrl = pageContext.url;

  showPasteLoading();
  clearPasteResult();

  try {
    const payload = { claim };
    if (currentPageUrl) {
      payload.source_url = currentPageUrl;
    }

    const result = await callAPI('/api/analyze', payload);
    currentAnalysisResult = result.data;

    // Save to history
    await saveToHistory({
      claim: claim.slice(0, 80),
      fullClaim: claim,
      verdict: result.data.verdict,
      trustScore: result.data.trust_score,
      domain: currentDomain || 'manual',
      timestamp: Date.now(),
    });

    // Update vouch score
    vouchScore = Math.min(100, vouchScore + Math.floor(result.data.trust_score / 10));
    await chrome.storage.local.set({ vouchScore });
    els.vouchScore.textContent = vouchScore;

    displayPasteResult(result.data);
    updateHistoryCount();
  } catch (err) {
    displayError(err.message || 'Unable to analyze. Check your connection and try again.');
  }
}

function showPasteLoading() {
  els.pasteLoading.style.display = 'block';
  els.pasteResult.style.display = 'none';
  els.analyzeBtn.disabled = true;
}

function clearPasteResult() {
  els.pasteResult.innerHTML = '';
  els.pasteResult.style.display = 'none';
}

function displayPasteResult(data) {
  els.pasteLoading.style.display = 'none';
  els.analyzeBtn.disabled = false;
  els.pasteResult.style.display = 'flex';

  const verdictClass = data.verdict.toLowerCase();
  const verdictIcon = getVerdictIcon(data.verdict);
  const scoreClass = data.trust_score >= 75 ? 'high' : data.trust_score >= 50 ? 'medium' : 'low';
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (data.trust_score / 100) * circumference;

  // Generate simplified explanation
  const simplified = generateSimplified(data);

  // Check if sources have same bias
  const hasEchoChamber = checkEchoChamber(data.sources);

  // Generate claim breakdown
  const breakdown = generateBreakdown(data);

  let html = `
    <!-- Verdict & Score Row -->
    <div class="result-header" style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
      <span class="verdict-badge ${verdictClass}">${verdictIcon}${data.verdict}</span>
      <div class="score-ring-container" style="margin:0;margin-left:auto;">
        <div class="score-ring">
          <svg width="90" height="90">
            <circle class="score-ring-bg" cx="45" cy="45" r="38"/>
            <circle class="score-ring-fill ${scoreClass}" cx="45" cy="45" r="38"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="score-ring-text">
            <div class="score-ring-value">${data.trust_score}</div>
            <div class="score-ring-label">Trust</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Virality -->
    <div class="virality-score">
      <svg class="virality-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 23c-1.5 0-2.8-.8-3.5-2-.2-.4-.1-.8.1-1.1.2-.3.6-.5 1-.4 1.3.2 2.5-.3 3.2-1.3.3-.5.4-1.1.3-1.7-.1-.3.1-.6.4-.7.3-.1.6.1.7.4.2 1 .1 2.1-.3 3-.6 1.3-1.7 2.2-3.1 2.5.8-.9 1.9-2 3.3-3.4 1.1-1.1 1.9-2.4 2.5-3.8.3-.6.9-1 1.6-1 .7 0 1.3.4 1.6 1 .2.4.2.9-.1 1.3-.7 1.2-1.5 2.2-2.5 3.1 1.8-2.2 3.3-4.8 4.3-7.6.2-.4.1-.9-.2-1.2-.3-.3-.8-.4-1.2-.2-1.3.7-2.8 1.2-4.3 1.5-1.8-1.5-3.9-2.6-6.2-3.1-.6-.1-1.1-.4-1.4-.9-.3-.5-.3-1.1.1-1.6.3-.5.9-.7 1.4-.6 1.4.3 2.8.8 4 1.5-.6-.8-1.3-1.6-2.1-2.3-.5-.4-.5-1.1-.1-1.6.4-.5 1.1-.5 1.6-.1 1.2 1 2.2 2.2 3 3.6.3.5.9.8 1.5.7.5-.1.9-.5 1.1-1 .6-1.6 1-3.2 1.1-4.9 0-.6.4-1.1 1-1.2.6 0 1.1.4 1.2 1 .2 2.1-.1 4.2-.7 6.2 1.7-1.5 3.1-3.2 4.2-5.1.3-.5.9-.7 1.4-.4.5.3.7.9.4 1.4-1.3 2.3-3 4.3-5 6 1.6-2.8 2.7-5.9 3.2-9.1.1-.6.6-1 1.2-1h.2c.6.1 1 .6 1 1.2-.6 3.9-1.9 7.6-3.8 11-1.1 1.9-2.5 3.6-4.2 5.1-.3.2-.5.6-.5 1s.2.7.5.9c.4.2.9.2 1.2-.1 1.4-1.2 2.6-2.6 3.5-4.2-1.1 2.4-2.6 4.6-4.4 6.6-1.2 1.3-2.5 2.4-4 3.3.9-.5 1.7-1 2.5-1.6.5-.4 1.1-.3 1.5.2s.3 1.1-.2 1.5c-1.1.8-2.2 1.5-3.4 2 .6-.5 1.1-1 1.6-1.5.4-.4 1.1-.5 1.5-.1.4.4.5 1.1.1 1.5-.6.7-1.3 1.3-2 1.8.6-.8 1.1-1.7 1.4-2.7.2-.6.8-.9 1.4-.7.6.2.9.8.7 1.4-.4 1.3-1 2.4-1.8 3.4 1.3-1.8 2.3-3.8 3-5.9.2-.6.8-.9 1.4-.7.6.2.9.8.7 1.4-.8 2.4-2 4.7-3.5 6.8 1-1.8 1.8-3.8 2.3-5.8.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.6 2.3-1.4 4.5-2.6 6.6.7-2.1 1.1-4.3 1.2-6.5 0-.6.5-1.1 1.1-1.1.6 0 1.1.5 1.1 1.1-.1 2.5-.6 4.9-1.4 7.2 2.5-4.8 3.9-10.2 4.2-15.7 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 5.9-1.8 11.6-4.5 16.7.8-2 1.4-4.1 1.8-6.2.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.4 2.4-1.1 4.7-2 6.9.4-1.6.6-3.3.7-4.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.1 1.8-.3 3.7-.8 5.5 2-5.5 3-11.4 2.9-17.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c.1 6.3-1 12.4-3.2 18.1 1.3-3.7 2.2-7.6 2.5-11.5 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 4.2-1.3 8.3-2.8 12.2 1-3 1.7-6.1 2-9.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 3.4-1.2 6.7-2.3 9.9.6-2.3 1-4.7 1.2-7.1 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.6-.7 5.2-1.3 7.7 2.2-4.8 3.4-10 3.7-15.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 5.7-1.6 11.2-4 16.4 1.3-3.5 2.2-7.1 2.7-10.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.5 4-1.4 7.8-2.9 11.5.7-2.3 1.1-4.6 1.4-7 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 2.5-.8 5-1.6 7.4.8-2.2 1.4-4.5 1.8-6.8.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.4 2.5-1.1 4.9-1.9 7.3 1.4-3.7 2.3-7.6 2.7-11.5 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.5 4.2-1.4 8.3-2.9 12.2.9-2.7 1.6-5.5 2-8.3.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.5 3-1.2 6-2.2 8.9.6-2.2 1-4.5 1.2-6.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.5-.7 4.9-1.3 7.2.7-2.4 1.2-4.8 1.5-7.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 2.6-.9 5.1-1.6 7.6.5-2.1.8-4.2 1-6.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.3-.6 4.5-1.1 6.7 1.5-4.8 2.3-9.8 2.4-14.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.1 5.4-1 10.6-2.6 15.7 1.1-3.5 1.8-7.1 2.1-10.7 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 3.8-1.1 7.6-2.3 11.2.7-2.5 1.1-5 1.4-7.6 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 2.7-.8 5.3-1.5 7.9 2.4-5.8 3.7-12 3.8-18.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 6.7-1.5 13.2-4 19.3.9-2.5 1.6-5.1 2.1-7.7.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.5 2.8-1.3 5.5-2.3 8.1 1.6-4.1 2.7-8.4 3.2-12.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.6 4.7-1.7 9.2-3.5 13.5 1.2-3.1 2-6.3 2.6-9.5.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.6 3.4-1.5 6.7-2.8 9.9.9-2.5 1.5-5 2-7.6.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.5 2.7-1.2 5.3-2.1 7.9 1.1-3.2 1.9-6.5 2.3-9.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.5 3.6-1.3 7.1-2.5 10.5.7-2.4 1.2-4.8 1.6-7.3.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.4 2.6-1 5.1-1.7 7.6 1-3.3 1.7-6.6 2.1-10 .1-.6.6-1 1.2-1h.1c.6.1 1 .6 1 1.2-.4 3.6-1.2 7.1-2.3 10.5.8-2.7 1.3-5.4 1.7-8.2.1-.6.6-1 1.2-.9.6.1 1 .6 1 1.2-.4 3-1 5.8-1.8 8.6.8-2.8 1.3-5.7 1.6-8.6 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.1-.9 6.1-1.7 9.1.6-2.6 1-5.2 1.3-7.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 2.8-.8 5.6-1.4 8.3.5-2.3.9-4.7 1.1-7 .1-.6.6-1 1.2-1h.1c.6.1 1 .6 1 1.2-.3 2.5-.7 5-1.2 7.4.8-3.2 1.3-6.5 1.4-9.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 3.5-.7 6.9-1.6 10.3 1-3.5 1.7-7.1 2-10.7 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.8-1.1 7.5-2.2 11.1.8-2.9 1.4-5.9 1.7-8.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 3.2-1.1 6.3-1.9 9.4.7-2.8 1.2-5.6 1.6-8.5.1-.6.6-1 1.2-.9.6.1 1 .6 1 1.2-.4 3-1 5.9-1.7 8.8 1.1-4 1.8-8.2 2.2-12.4 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 4.4-1.2 8.8-2.4 13 .6-2.5 1.1-5.1 1.4-7.7.1-.6.6-1 1.2-.9.6.1 1 .6 1 1.2-.4 2.7-1 5.4-1.6 8 .7-2.7 1.1-5.5 1.4-8.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 2.9-.8 5.8-1.5 8.7.5-2.4.8-4.8 1-7.2 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.5-.6 5-1.1 7.5.7-3.2 1.1-6.4 1.2-9.7 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 3.5-.7 6.9-1.4 10.2.9-3.8 1.4-7.7 1.6-11.7 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 4.2-.8 8.3-1.7 12.3.6-2.7 1-5.4 1.2-8.2 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 2.9-.8 5.8-1.3 8.6.5-2.6.8-5.2 1-7.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.8-.6 5.5-1.2 8.2.4-2.3.6-4.6.8-6.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.4-.5 4.8-1 7.2 1.6-5.5 2.4-11.2 2.5-17 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.1 6-1 11.9-2.7 17.5.8-2.8 1.3-5.7 1.7-8.6 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 3.1-.9 6.1-1.8 9.1 1-3.6 1.6-7.2 1.9-10.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.9-1 7.7-2 11.4.8-3.1 1.3-6.3 1.7-9.5 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 3.3-1 6.6-1.8 9.8.6-2.6 1-5.3 1.3-8 .1-.6.6-1 1.2-.9.6.1 1 .6 1 1.2-.3 2.8-.8 5.6-1.4 8.3.6-2.8 1-5.6 1.2-8.4 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3-.8 5.9-1.4 8.8.7-3 1.1-6 1.3-9.1 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 3.2-.7 6.4-1.4 9.5.5-2.4.8-4.8 1-7.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.6-.6 5.1-1.1 7.6.6-2.9 1-5.8 1.2-8.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 3.1-.7 6.2-1.3 9.2.4-2.3.7-4.6.9-6.9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.5-.6 4.9-1 7.3.5-2.8.8-5.7 1-8.6 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 3.1-.6 6.1-1.2 9.1.6-3 1-6.1 1.2-9.2 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.3-.8 6.5-1.4 9.7.7-3.3 1.1-6.6 1.4-10 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.5-.8 7-1.5 10.4.6-3 1-6.1 1.2-9.2 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.2-.7 6.4-1.4 9.6.6-3 1-6 1.2-9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.2-.7 6.3-1.3 9.4.6-2.9.9-5.8 1.1-8.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 3.1-.6 6.2-1.2 9.2.4-2.6.7-5.2.8-7.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.8-.5 5.5-1 8.2 1.3-5.2 2-10.6 2.1-16 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.1 5.6-.8 11.2-2.2 16.5 1-4.1 1.6-8.2 1.9-12.4 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 4.3-.9 8.6-1.9 12.8.9-3.9 1.5-7.8 1.8-11.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 4.2-1.1 8.3-2.1 12.3.7-3.2 1.2-6.5 1.5-9.8 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.4 3.5-.9 6.9-1.7 10.3.6-2.8 1-5.7 1.3-8.6 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.1-.8 6.1-1.4 9.1.5-2.5.8-5.1 1-7.6 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.7-.6 5.3-1.1 7.9.5-2.7.8-5.4 1-8.2 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.9-.6 5.7-1.1 8.5.5-2.7.8-5.5 1-8.3 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.2 2.9-.6 5.8-1.2 8.7.6-3.1 1-6.2 1.2-9.4 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.3-.8 6.6-1.4 9.8.6-3 1-6 1.2-9.1 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.2-.7 6.4-1.3 9.5.6-3 1-6 1.2-9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.1-.7 6.2-1.3 9.2.6-3 1-6 1.2-9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.1-.7 6.2-1.3 9.2.6-3 1-6 1.2-9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.1-.7 6.2-1.3 9.2.6-3 1-6 1.2-9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.1-.7 6.2-1.3 9.2.6-3 1-6 1.2-9 0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1c-.3 3.1-.7 6.2-1.3 9.2z"/>
      </svg>
      <span class="virality-label">Virality Risk</span>
      <span class="virality-value" id="viralityValue">${Math.floor(Math.random() * 40 + 30)}%</span>
    </div>

    <!-- Explanation -->
    <div class="explanation-box">
      <div class="explanation-label">Explanation</div>
      <div class="explanation-text">${escHtml(data.explanation)}</div>
    </div>
  `;

  // Why Misleading
  if (data.why_misleading) {
    html += `
      <div class="why-misleading-box">
        <div class="why-misleading-label">Why Misleading</div>
        <div class="why-misleading-text">${escHtml(data.why_misleading)}</div>
      </div>
    `;
  }

  // Bias Meter
  const biasPos = getBiasPosition(data.bias_analysis);
  html += `
    <div class="bias-meter">
      <div class="bias-label">Political Bias Spectrum</div>
      <div class="bias-track">
        <div class="bias-indicator" style="left: calc(${biasPos}% - 7px);"></div>
      </div>
      <div class="bias-scale">
        <span>Far Left</span>
        <span>Left</span>
        <span>Center</span>
        <span>Right</span>
        <span>Far Right</span>
      </div>
      <div class="bias-value">${escHtml(data.bias_analysis || 'Center')}</div>
    </div>
  `;

  // Claim Breakdown
  if (breakdown.length > 0) {
    html += `
      <div class="breakdown-box">
        <div class="breakdown-label">Claim Breakdown</div>
        <ol class="breakdown-list">
          ${breakdown.map((item, i) => `
            <li>
              <span class="breakdown-num">${i + 1}</span>
              ${escHtml(item)}
            </li>
          `).join('')}
        </ol>
      </div>
    `;
  }

  // Simplified Explanation
  html += `
    <div class="simplified-box">
      <div class="simplified-label">In Plain Terms</div>
      <div class="simplified-text">${simplified}</div>
    </div>
  `;

  // Sources
  if (data.sources && data.sources.length > 0) {
    html += `
      <div class="sources-box">
        <div class="sources-label">Sources (${data.sources.length})</div>
        ${data.sources.slice(0, 5).map(src => `
          <div class="source-card">
            <div class="source-header">
              <div class="source-title">${escHtml(src.title || 'Untitled')}</div>
              <span class="source-relevance ${getReliabilityClass(src.reliability)}">${getReliabilityLabel(src.reliability)}</span>
            </div>
            <div class="source-publisher">${escHtml(src.publisher || 'Unknown Publisher')}</div>
            <div class="source-summary">${escHtml(src.summary || '')}</div>
            ${src.url ? `<a href="${escHtml(src.url)}" target="_blank" rel="noreferrer" class="source-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/>
              </svg>
              View Source
            </a>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Echo Chamber Warning
  if (hasEchoChamber) {
    html += `
      <div class="echo-chamber-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <p><strong>Echo Chamber Alert:</strong> All sources share similar bias. Consider seeking diverse perspectives.</p>
      </div>
    `;
  }

  // Counter Narrative Button
  if (data.verdict === 'false' || data.verdict === 'misleading') {
    html += `
      <button class="counter-narrative-btn" id="counterNarrativeBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:6px;">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        Generate Counter-Narrative
      </button>
    `;
  }

  els.pasteResult.innerHTML = html;

  // Attach counter narrative handler
  const counterBtn = document.getElementById('counterNarrativeBtn');
  if (counterBtn) {
    counterBtn.addEventListener('click', handleCounterNarrative);
  }
}

// ============================================
// TAB 2: SCAN PAGE
// ============================================
async function handleScanPage() {
  els.scanningSection.style.display = 'block';
  els.claimsSection.style.display = 'none';
  els.scanEmptyState.style.display = 'none';
  els.claimResultSection.style.display = 'none';

  try {
    const pageInfo = await getPageInfo();
    currentDomain = pageInfo.domain;
    currentPageUrl = pageInfo.url;
    els.scanDomain.textContent = currentDomain || pageInfo.url || 'Unsupported page';

    if (!currentPageUrl) {
      els.scanningSection.style.display = 'none';
      displayScanEmptyState('This page type cannot be scanned. Open a regular website article and try again.');
      return;
    }

    const pageText = pageInfo.text || '';
    const pageTitle = pageInfo.title || '';
    const pageDescription = pageInfo.description || '';

    if (!pageText || pageText.length < 50) {
      els.scanningSection.style.display = 'none';
      if (pageTitle.length >= 20 || pageDescription.length >= 30) {
        displayDetectedClaims(
          [pageTitle, pageDescription]
            .filter(Boolean)
            .filter(item => item.length >= 20)
            .slice(0, 2)
            .map(claim => ({ claim }))
        );
      } else {
        displayScanEmptyState('We could not extract enough readable article text from this page.');
      }
      return;
    }

    // Detect claims
    const detectResult = await callAPI('/api/detect-claims', { text: pageText });

    els.scanningSection.style.display = 'none';

    if (detectResult.data && detectResult.data.claims && detectResult.data.claims.length > 0) {
      displayDetectedClaims(detectResult.data.claims.slice(0, 3));
    } else if (pageTitle.length >= 20 || pageDescription.length >= 30) {
      displayDetectedClaims(
        [pageTitle, pageDescription]
          .filter(Boolean)
          .filter(item => item.length >= 20)
          .slice(0, 2)
          .map(claim => ({ claim }))
      );
    } else {
      displayScanEmptyState('No strong checkable claims were found on this page.');
    }
  } catch (err) {
    els.scanningSection.style.display = 'none';
    displayScanEmptyState(err.message || 'Failed to scan page. Try again.');
  }
}

function extractPageText() {
  const selection = window.getSelection()?.toString()?.trim();
  if (selection && selection.length > 20) {
    return selection;
  }

  // Try article content
  const article = document.querySelector('article, [role="main"], main, .post-content, .entry-content');
  if (article) {
    return article.innerText.trim().slice(0, 5000);
  }

  // Fallback to body
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.innerText.trim())
    .filter(t => t.length > 30)
    .slice(0, 30);

  return paragraphs.join('\n\n');
}

function displayScanEmptyState(message) {
  els.claimsSection.style.display = 'none';
  els.claimResultSection.style.display = 'none';
  els.scanEmptyState.style.display = 'block';
  const desc = els.scanEmptyState.querySelector('.empty-desc');
  if (desc) {
    desc.textContent = message;
  }
}

function displayDetectedClaims(claims) {
  els.claimsSection.style.display = 'flex';
  els.claimsSection.innerHTML = claims.map((claim, i) => `
    <div class="claim-card" data-claim-index="${i}" data-claim="${escHtml(claim.claim || claim)}">
      <div class="claim-card-header">
        <svg class="claim-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="claim-card-label">Detected Claim ${i + 1}</span>
      </div>
      <div class="claim-card-text">${escHtml(claim.claim || claim)}</div>
      <div class="claim-card-action">Click to analyze →</div>
    </div>
  `).join('');

  // Attach click handlers
  els.claimsSection.querySelectorAll('.claim-card').forEach(card => {
    card.addEventListener('click', () => {
      // Remove selected from others
      els.claimsSection.querySelectorAll('.claim-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const claimText = card.dataset.claim;
      handleAnalyzeClaim(claimText, currentPageUrl);
    });
  });
}

async function handleAnalyzeClaim(claimText, sourceUrl = null) {
  els.claimResultSection.style.display = 'flex';
  els.claimResultSection.innerHTML = `
    <div class="loading-section" style="padding:24px 0;">
      <div class="loading-pulse"></div>
      <p class="loading-text">Analyzing claim...</p>
    </div>
  `;

  try {
    const payload = { claim: claimText };
    if (sourceUrl) {
      payload.source_url = sourceUrl;
    }

    const result = await callAPI('/api/analyze', payload);
    displayClaimResult(result.data);
  } catch (err) {
    els.claimResultSection.innerHTML = `
      <div class="error-state">
        <p class="error-desc">Analysis failed. Try again.</p>
        <button class="btn btn-secondary btn-sm" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

function displayClaimResult(data) {
  // Reuse paste result rendering but in a smaller format
  const verdictClass = data.verdict.toLowerCase();
  const verdictIcon = getVerdictIcon(data.verdict);
  const scoreClass = data.trust_score >= 75 ? 'high' : data.trust_score >= 50 ? 'medium' : 'low';
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (data.trust_score / 100) * circumference;

  els.claimResultSection.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span class="verdict-badge ${verdictClass}">${verdictIcon}${data.verdict}</span>
      <div style="position:relative;width:70px;height:70px;">
        <svg width="70" height="70" style="transform:rotate(-90deg);">
          <circle fill="none" stroke="var(--border)" stroke-width="5" cx="35" cy="35" r="32"/>
          <circle fill="none" stroke="${scoreClass === 'high' ? '#10b981' : scoreClass === 'medium' ? '#f59e0b' : '#ef4444'}" stroke-width="5" stroke-linecap="round"
            cx="35" cy="35" r="32" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
        </svg>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
          <div style="font-size:18px;font-weight:700;color:var(--foreground);line-height:1;">${data.trust_score}</div>
        </div>
      </div>
    </div>
    <div class="explanation-text" style="font-size:12px;color:#a1a1aa;line-height:1.5;">${escHtml(data.explanation?.slice(0, 150) || '')}</div>
    <button class="btn btn-secondary btn-sm" onclick="this.closest('.claim-result-section').style.display='none';" style="margin-top:8px;">Close</button>
  `;
}

// ============================================
// TAB 3: SITE CREDIBILITY
// ============================================
async function handleSiteCredibility() {
  els.siteLoading.style.display = 'block';
  els.siteResultSection.style.display = 'none';

  try {
    const pageInfo = await getPageInfo();
    const domain = pageInfo.domain;

    if (!domain) {
      throw new Error('This page does not have a supported website domain to check.');
    }

    currentDomain = domain;
    currentPageUrl = pageInfo.url;
    els.siteDomainLabel.textContent = domain;
    els.siteFavicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    // Check cache first
    const { siteCache = {} } = await chrome.storage.local.get('siteCache');
    const cached = siteCache[domain];

    if (cached && !isCacheStale(cached.timestamp)) {
      displaySiteResult(cached.data, cached.timestamp);
      els.siteLoading.style.display = 'none';
      return;
    }

    const result = await callAPI('/site-credibility', {
      domain,
      source_url: currentPageUrl,
      page_title: pageInfo.title || '',
      page_description: pageInfo.description || '',
      page_text: pageInfo.text || '',
    });
    const siteData = result?.data || result;
    cachedSiteData = siteData;

    // Cache it
    siteCache[domain] = {
      data: siteData,
      timestamp: Date.now(),
    };
    await chrome.storage.local.set({ siteCache });

    displaySiteResult(siteData, null);
  } catch (err) {
    els.siteLoading.style.display = 'none';
    displaySiteError(err.message || 'Failed to check site credibility.');
  }
}

async function handleRefreshSite() {
  // Force refresh by clearing cache for this domain
  if (currentDomain) {
    const { siteCache = {} } = await chrome.storage.local.get('siteCache');
    delete siteCache[currentDomain];
    await chrome.storage.local.set({ siteCache });
  }
  handleSiteCredibility();
}

function displaySiteResult(data, cachedTimestamp) {
  els.siteLoading.style.display = 'none';
  els.siteResultSection.style.display = 'flex';

  const scoreClass = data.credibilityScore >= 75 ? 'high' : data.credibilityScore >= 50 ? 'medium' : 'low';
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (data.credibilityScore / 100) * circumference;
  const verdictClass = getCredibilityVerdictClass(data.credibilityVerdict);

  // Bias position
  const biasMap = {
    'Far Left': 10, 'Left': 25, 'Center-Left': 38,
    'Center': 50, 'Center-Right': 62, 'Right': 75, 'Far Right': 90,
  };
  const biasPos = biasMap[data.editorialBias] || 50;

  let html = `
    <!-- Overall Score -->
    <div class="site-card">
      <div class="site-card-header">
        <span class="site-card-title">Overall Credibility</span>
        <span class="credibility-verdict ${verdictClass}">${data.credibilityVerdict}</span>
      </div>
      <div class="site-score-ring">
        <div class="score-ring">
          <svg width="90" height="90">
            <circle class="score-ring-bg" cx="45" cy="45" r="42"/>
            <circle class="score-ring-fill ${scoreClass}" cx="45" cy="45" r="42"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="score-ring-text">
            <div class="score-ring-value">${data.credibilityScore}</div>
            <div class="score-ring-label">Score</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ownership & Funding -->
    <div class="site-card">
      <div class="site-card-title" style="margin-bottom:8px;">Ownership &amp; Funding</div>
      <div class="site-info-row">
        <span class="site-info-label">Ownership</span>
        <span class="site-info-value">${escHtml(data.ownership || 'Unknown')}</span>
      </div>
      <div class="site-info-row">
        <span class="site-info-label">Funding</span>
        <span class="site-info-value">${escHtml(data.funding || 'Unknown')}</span>
      </div>
    </div>

    <!-- Editorial Bias -->
    <div class="site-card">
      <div class="site-card-title" style="margin-bottom:8px;">Editorial Bias</div>
      <div class="bias-meter" style="margin:0;">
        <div class="bias-track">
          <div class="bias-indicator" style="left: calc(${biasPos}% - 7px);"></div>
        </div>
        <div class="bias-scale">
          <span>Far Left</span><span>Left</span><span>Center</span><span>Right</span><span>Far Right</span>
        </div>
        <div class="bias-value">${escHtml(data.editorialBias || 'Unknown')}</div>
      </div>
    </div>

    <!-- Transparency & Fact-Check -->
    <div class="site-card">
      <div class="site-info-row">
        <span class="site-info-label">Transparency Score</span>
        <span class="site-info-value">${data.transparencyScore}/100</span>
      </div>
      <div class="site-info-row">
        <span class="site-info-label">Fact-Check Record</span>
        <span class="site-info-value">${escHtml(data.factCheckTrackRecord || 'Unknown')}</span>
      </div>
    </div>

    <!-- Known For -->
    <div class="site-card">
      <div class="site-card-title" style="margin-bottom:8px;">Known For</div>
      <ul class="known-for-list">
        ${(data.knownFor || []).map(k => `<li>${escHtml(k)}</li>`).join('')}
      </ul>
    </div>
  `;

  // Recommended Alternatives
  if (data.recommendedAlternatives && data.recommendedAlternatives.length > 0) {
    html += `
      <div class="site-card">
        <div class="site-card-title" style="margin-bottom:8px;">Recommended Alternatives</div>
        ${data.recommendedAlternatives.map(alt => `
          <a href="${escHtml(alt.url)}" target="_blank" rel="noreferrer" class="alt-source-card">
            <div class="alt-source-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
              </svg>
            </div>
            <div>
              <div class="alt-source-name">${escHtml(alt.name)}</div>
              <div class="alt-source-reason">${escHtml(alt.reason)}</div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  if (cachedTimestamp) {
    const date = new Date(cachedTimestamp);
    html += `<div class="cache-timestamp">Last checked: ${date.toLocaleString()}</div>`;
  }

  els.siteResultSection.innerHTML = html;
}

function displaySiteError(msg) {
  els.siteLoading.style.display = 'none';
  els.siteResultSection.style.display = 'flex';
  els.siteResultSection.innerHTML = `
    <div class="error-state">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <p class="error-title">Unable to check site</p>
      <p class="error-desc">${escHtml(msg)}</p>
    </div>
  `;
}

// ============================================
// COUNTER NARRATIVE
// ============================================
async function handleCounterNarrative() {
  if (!currentAnalysisResult) return;

  const btn = document.getElementById('counterNarrativeBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generating...';
  }

  try {
    const result = await callAPI('/api/counter-narrative', {
      claim: els.claimInput.value.trim(),
      verdict: currentAnalysisResult.verdict,
      explanation: currentAnalysisResult.explanation,
    });

    // Display counter narrative in a modal-like box
    const box = document.createElement('div');
    box.className = 'simplified-box';
    box.style.marginTop = '8px';
    box.innerHTML = `
      <div class="simplified-label">Counter-Narrative</div>
      <div class="simplified-text">${escHtml(result.data.counter_narrative)}</div>
      <button class="btn btn-secondary btn-sm" onclick="this.parentElement.remove();" style="margin-top:8px;">Dismiss</button>
    `;

    const counterSection = document.querySelector('.counter-narrative-btn');
    if (counterSection) {
      counterSection.parentElement.insertBefore(box, counterSection.nextSibling);
    }
  } catch (err) {
    showToast('Failed to generate counter-narrative');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:6px;">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        Generate Counter-Narrative
      `;
    }
  }
}

// ============================================
// API CALLS
// ============================================
async function callAPI(endpoint, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 15 seconds');
    }
    throw err;
  }
}

async function getActivePageContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = isHttpUrl(tab?.url) ? tab.url : null;
    return {
      url,
      domain: extractDomain(tab?.url),
      title: tab?.title || '',
    };
  } catch (_err) {
    return { url: null, domain: null, title: '' };
  }
}

async function getPageInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const fallback = {
    url: isHttpUrl(tab?.url) ? tab.url : null,
    domain: extractDomain(tab?.url),
    title: tab?.title || '',
    text: '',
  };

  if (!tab?.id || !fallback.url) {
    return fallback;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' });
    if (response && typeof response === 'object') {
      return {
        url: response.url || fallback.url,
        domain: response.domain || fallback.domain,
        title: response.title || fallback.title,
        description: response.description || '',
        text: response.text || '',
      };
    }
  } catch (_err) {
    // Fall through to executeScript fallback below.
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageText,
    });
    return {
      ...fallback,
      description: '',
      text: results[0]?.result || '',
    };
  } catch (_err) {
    return { ...fallback, description: '' };
  }
}

function isHttpUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

// ============================================
// HISTORY & VOUCH SCORE
// ============================================
async function saveToHistory(entry) {
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift(entry);
  await chrome.storage.local.set({ history: history.slice(0, 50) });
  analysisCount = history.length;
}

function loadVouchScore() {
  chrome.storage.local.get(['vouchScore', 'history'], (res) => {
    vouchScore = res.vouchScore || 0;
    analysisCount = (res.history || []).length;
    els.vouchScore.textContent = vouchScore;
    els.historyCount.textContent = `${analysisCount} analyses`;
  });
}

function updateHistoryCount() {
  chrome.storage.local.get('history', (res) => {
    const count = (res.history || []).length;
    els.historyCount.textContent = `${count} analyses`;
  });
}

// ============================================
// ERROR DISPLAY
// ============================================
function displayError(msg) {
  els.pasteLoading.style.display = 'none';
  els.analyzeBtn.disabled = false;

  els.pasteResult.style.display = 'flex';
  els.pasteResult.innerHTML = `
    <div class="error-state">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <p class="error-title">Analysis Failed</p>
      <p class="error-desc">${escHtml(msg)}</p>
      <button class="btn btn-secondary btn-sm" onclick="location.reload()" style="margin-top:8px;">Try Again</button>
    </div>
  `;
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--muted);
    color: var(--foreground);
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    border: 1px solid var(--border);
    z-index: 1000;
    white-space: nowrap;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ============================================
// UTILITIES
// ============================================
function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getVerdictIcon(verdict) {
  switch (verdict.toLowerCase()) {
    case 'true':
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    case 'false':
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    case 'misleading':
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>';
    default:
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>';
  }
}

function getReliabilityClass(rel) {
  if (!rel) return 'low';
  const r = rel.toString().toLowerCase();
  if (r === 'high') return 'high';
  if (r === 'medium') return 'medium';
  return 'low';
}

function getReliabilityLabel(rel) {
  if (!rel) return 'Unknown';
  const r = rel.toString().toLowerCase();
  if (r === 'high') return 'High';
  if (r === 'medium') return 'Medium';
  return 'Low';
}

function getBiasPosition(bias) {
  if (!bias) return 50;
  const b = bias.toLowerCase();
  if (b.includes('far left')) return 10;
  if (b.includes('left')) return 25;
  if (b.includes('center-left')) return 38;
  if (b.includes('center')) return 50;
  if (b.includes('center-right')) return 62;
  if (b.includes('right')) return 75;
  if (b.includes('far right')) return 90;
  return 50;
}

function getCredibilityVerdictClass(verdict) {
  if (!verdict) return 'mixed';
  const v = verdict.toLowerCase();
  if (v.includes('reliable') && !v.includes('un')) return 'reliable';
  if (v.includes('generally reliable')) return 'generally-reliable';
  if (v.includes('mixed')) return 'mixed';
  if (v.includes('unreliable') || v.includes('satire')) return 'unreliable';
  return 'mixed';
}

function extractDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function isCacheStale(timestamp, maxAgeMs = 30 * 60 * 1000) {
  return Date.now() - timestamp > maxAgeMs;
}

function generateSimplified(data) {
  const v = (data.verdict || '').toLowerCase();
  const score = data.trust_score || 50;

  if (v === 'true') {
    return 'This claim checks out. Multiple reliable sources confirm the facts presented.';
  } else if (v === 'false') {
    return 'This claim is false. The evidence contradicts what\'s being stated.';
  } else if (v === 'misleading') {
    return 'This claim has some truth but misses important context. The full picture is more nuanced.';
  } else {
    return 'There isn\'t enough reliable information to verify this claim either way.';
  }
}

function generateBreakdown(data) {
  const breakdown = [];
  const claim = (data.claim || '').toLowerCase();
  const explanation = (data.explanation || '').toLowerCase();

  if (explanation.includes('source')) {
    breakdown.push('Source verification was performed against trusted databases');
  }
  if (explanation.includes('bias')) {
    breakdown.push('Potential framing bias was detected in the claim presentation');
  }
  if (data.why_misleading) {
    breakdown.push('Key context missing from the claim was identified');
  }
  if (data.verdict === 'true') {
    breakdown.push('Evidence from multiple sources supports the main assertion');
  } else if (data.verdict === 'false') {
    breakdown.push('Contradicting evidence was found in reliable sources');
  } else {
    breakdown.push('Claim analysis completed with available information');
  }

  return breakdown.slice(0, 4);
}

function checkEchoChamber(sources) {
  if (!sources || sources.length < 2) return false;
  // Simple check: if all sources have the same publisher pattern
  const publishers = sources.map(s => (s.publisher || '').toLowerCase());
  const uniquePublishers = new Set(publishers);
  return uniquePublishers.size === 1 && publishers.length > 1;
}

// ============================================
// START
// ============================================
init();
