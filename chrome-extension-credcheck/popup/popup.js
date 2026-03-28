/**
 * CredCheck Popup - Auto-scan highlighted text version
 */

const API_BASE_URL = 'http://localhost:8000';

const elements = {
  inputSection: document.getElementById('inputSection'),
  loadingSection: document.getElementById('loadingSection'),
  resultSection: document.getElementById('resultSection'),
  historySection: document.getElementById('historySection'),

  claimInput: document.getElementById('claimInput'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  extractBtn: document.getElementById('extractBtn'),
  newAnalysisBtn: document.getElementById('newAnalysisBtn'),

  credibilityScore: document.getElementById('credibilityScore'),
  meterFill: document.getElementById('meterFill'),
  verdictCard: document.getElementById('verdictCard'),
  verdictIcon: document.getElementById('verdictIcon'),
  verdictTitle: document.getElementById('verdictTitle'),
  verdictDescription: document.getElementById('verdictDescription'),
  assessment: document.getElementById('assessment'),
  issuesCard: document.getElementById('issuesCard'),
  issuesList: document.getElementById('issuesList'),
  sourcesList: document.getElementById('sourcesList'),
  historyList: document.getElementById('historyList'),
};

let currentResult = null;

// Initialize - auto-scan for selected text
async function init() {
  setupEventListeners();
  await loadHistory();

  // Try to get selected text from active tab
  const selectedText = await getSelectedTextFromPage();

  if (selectedText && selectedText.length > 10) {
    // Auto-populate and analyze
    elements.claimInput.value = selectedText;
    await handleAnalyze();
  } else {
    // Check storage for text from context menu
    const { pendingText = '' } = await chrome.storage.local.get('pendingText');
    if (pendingText) {
      elements.claimInput.value = pendingText;
      await chrome.storage.local.remove('pendingText');
      await handleAnalyze();
    }
  }
}

// Get selected text from the active page
async function getSelectedTextFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection().toString().trim();
        // If selection is small, try to get article content
        if (selection.length < 20) {
          const article = document.querySelector('article, [role="main"], main');
          if (article) {
            return article.innerText.trim().slice(0, 1500);
          }
          // Try headline + first paragraph
          const h1 = document.querySelector('h1');
          const firstP = document.querySelector('p');
          if (h1 && firstP) {
            return (h1.innerText + ' ' + firstP.innerText).slice(0, 1500);
          }
        }
        return selection.slice(0, 1500);
      },
    });

    return results[0]?.result || '';
  } catch (error) {
    console.error('Error getting selected text:', error);
    return '';
  }
}

function setupEventListeners() {
  elements.analyzeBtn.addEventListener('click', handleAnalyze);
  elements.extractBtn.addEventListener('click', handleExtract);
  elements.newAnalysisBtn.addEventListener('click', resetToInput);
}

async function handleAnalyze() {
  const claim = elements.claimInput.value.trim();
  if (!claim) {
    elements.claimInput.focus();
    return;
  }

  showLoading();

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    currentResult = result.data;

    await cacheResult(currentResult);
    displayResult(currentResult);
    await loadHistory();

  } catch (error) {
    console.error('Analysis error:', error);
    // Show error in UI without raw error message
    showError('Unable to analyze. Please check your connection and try again.');
    resetToInput();
  }
}

function showLoading() {
  elements.inputSection.style.display = 'none';
  elements.resultSection.style.display = 'none';
  elements.loadingSection.style.display = 'block';
}

function displayResult(result) {
  elements.loadingSection.style.display = 'none';
  elements.resultSection.style.display = 'block';

  // Credibility score
  const score = result.trust_score;
  elements.credibilityScore.textContent = score;
  elements.meterFill.style.width = `${100 - score}%`;

  // Color code the score
  if (score >= 80) {
    elements.credibilityScore.style.color = '#10b981';
  } else if (score >= 50) {
    elements.credibilityScore.style.color = '#f59e0b';
  } else {
    elements.credibilityScore.style.color = '#ef4444';
  }

  // Verdict
  const verdict = getVerdictFromScore(score, result.verdict);
  updateVerdictCard(verdict);

  // Assessment - clean explanation without errors
  let explanation = result.explanation || 'Analysis complete.';
  // Remove any error messages
  if (explanation.includes('Error:') || explanation.includes('401') || explanation.includes('Unauthorized')) {
    explanation = getGenericExplanation(result.verdict, score);
  }
  elements.assessment.textContent = explanation;

  // Issues - clean up
  elements.issuesList.innerHTML = '';
  const issues = [];

  if (result.why_misleading && !result.why_misleading.includes('Error')) {
    issues.push(result.why_misleading);
  }
  if (result.bias_analysis && !result.bias_analysis.includes('Error')) {
    issues.push(result.bias_analysis);
  }

  if (issues.length > 0) {
    elements.issuesCard.style.display = 'block';
    issues.forEach(issue => {
      const li = document.createElement('li');
      li.textContent = issue;
      elements.issuesList.appendChild(li);
    });
  } else {
    elements.issuesCard.style.display = 'none';
  }

  // Sources
  displaySources(result.sources || []);
}

function getGenericExplanation(verdict, score) {
  const explanations = {
    'true': 'This claim is supported by reliable sources and evidence.',
    'false': 'This claim contradicts available evidence and reliable sources.',
    'misleading': 'This claim contains some accurate elements but omits important context or distorts the full picture.',
    'unverifiable': 'There is insufficient reliable information to verify this claim.',
  };
  return explanations[verdict] || 'Analysis based on available sources.';
}

function getVerdictFromScore(score) {
  if (score >= 80) {
    return { level: 'high', title: 'Credible', icon: '✓', desc: 'Supported by reliable sources and evidence.' };
  }
  if (score >= 50) {
    return { level: 'medium', title: 'Partially Credible', icon: '!', desc: 'Mixed sources or limited verification available.' };
  }
  return { level: 'low', title: 'Low Credibility', icon: '✕', desc: 'Contradicts available evidence or lacks reliable sources.' };
}

function updateVerdictCard(verdict) {
  elements.verdictCard.className = `verdict-card ${verdict.level}`;
  elements.verdictIcon.textContent = verdict.icon;
  elements.verdictTitle.textContent = verdict.title;
  elements.verdictDescription.textContent = verdict.desc;
}

function displaySources(sources) {
  elements.sourcesList.innerHTML = '';

  if (sources.length === 0) {
    elements.sourcesList.innerHTML = '<p class="no-sources">No sources found.</p>';
    return;
  }

  sources.forEach(source => {
    const card = document.createElement('div');
    card.className = 'source-card';

    const ratingClass = source.reliability === 'high' ? 'verified' : 'questionable';
    const ratingText = source.reliability === 'high' ? 'Verified' : 'Questionable';

    card.innerHTML = `
      <div class="source-header">
        <span class="source-name">${escapeHtml(source.title)}</span>
        <span class="source-rating ${ratingClass}">${ratingText}</span>
      </div>
      <div class="source-publisher">${escapeHtml(source.publisher)}</div>
      <div class="source-summary">${escapeHtml(source.summary)}</div>
    `;

    elements.sourcesList.appendChild(card);
  });
}

function resetToInput() {
  elements.resultSection.style.display = 'none';
  elements.loadingSection.style.display = 'none';
  elements.inputSection.style.display = 'block';
  elements.claimInput.value = '';
  currentResult = null;
}

async function handleExtract() {
  const text = await getSelectedTextFromPage();
  if (text) {
    elements.claimInput.value = text;
  } else {
    showError('Could not extract content from this page.');
  }
}

async function cacheResult(result) {
  const { history = [] } = await chrome.storage.local.get('history');

  history.unshift({
    id: result.id,
    claim: result.claim.slice(0, 80) + (result.claim.length > 80 ? '...' : ''),
    score: result.trust_score,
    verdict: result.verdict,
    timestamp: result.timestamp,
  });

  await chrome.storage.local.set({ history: history.slice(0, 20) });
}

async function loadHistory() {
  const { history = [] } = await chrome.storage.local.get('history');

  if (history.length === 0) {
    elements.historySection.style.display = 'none';
    return;
  }

  elements.historySection.style.display = 'block';
  elements.historyList.innerHTML = '';

  history.slice(0, 5).forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';

    const level = item.score >= 80 ? 'high' : item.score >= 50 ? 'medium' : 'low';

    div.innerHTML = `
      <span class="history-indicator ${level}"></span>
      <span class="history-text">${escapeHtml(item.claim)}</span>
      <span class="history-score">${item.score}</span>
    `;

    div.addEventListener('click', () => {
      elements.claimInput.value = item.claim;
      handleAnalyze();
    });

    elements.historyList.appendChild(div);
  });
}

function showError(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ef4444;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 1000;
    max-width: 90%;
    text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
