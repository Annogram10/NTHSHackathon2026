/**
 * Vouch Chrome Extension - Background Service Worker
 * Handles context menu, message passing, and API proxying
 */

const API_BASE_URL = 'http://localhost:8000';

// ============================================
// CONTEXT MENU
// ============================================
chrome.runtime.onInstalled.addListener(() => {
  console.log('Vouch extension installed');

  // Create context menu for selected text
  chrome.contextMenus.create({
    id: 'vouchThisClaim',
    title: 'Vouch this claim',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'vouchThisClaim' && info.selectionText) {
    // Send selection to content script to show tooltip
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_TOOLTIP',
          text: info.selectionText,
        }).catch(() => {
          // Fallback: open popup
          chrome.storage.local.set({ pendingText: info.selectionText }, () => {
            chrome.action.openPopup();
          });
        });
      }
    });
  }
});

// ============================================
// MESSAGE HANDLING
// ============================================
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'ANALYZE_TEXT') {
    handleAnalyzeText(request.text)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.type === 'DETECT_CLAIMS') {
    handleDetectClaims(request.text)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === 'SITE_CREDIBILITY') {
    handleSiteCredibility(request.domain)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === 'GET_VOUCH_SCORE') {
    chrome.storage.local.get(['vouchScore', 'history'], (res) => {
      sendResponse({
        vouchScore: res.vouchScore || 0,
        analysisCount: (res.history || []).length,
      });
    });
    return true;
  }

  if (request.type === 'CHECK_SELECTION') {
    handleAnalyzeText(request.text)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// ============================================
// API HANDLERS
// ============================================
async function handleAnalyzeText(text) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim: text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

async function handleDetectClaims(text) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/detect-claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

async function handleSiteCredibility(domain) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/site-credibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// ============================================
// UTILITIES
// ============================================
async function fetchWithTimeout(url, options, timeout = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 15 seconds');
    }
    throw err;
  }
}

// ============================================
// KEEP SERVICE WORKER ALIVE
// ============================================
if (chrome.alarms) {
  chrome.alarms.create('keepAlive', { periodInMinutes: 4.9 });
  chrome.alarms.onAlarm.addListener(() => {
    // Service worker stays alive
  });
}

console.log('Vouch background service worker loaded');
