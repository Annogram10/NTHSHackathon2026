/**
 * CredCheck Background Service
 * Handles API calls and context menu
 */

const API_BASE_URL = 'http://localhost:8000';

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('CredCheck installed');

  // Create context menu
  chrome.contextMenus.create({
    id: 'checkCredibility',
    title: 'Check Credibility',
    contexts: ['selection'],
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'checkCredibility') {
    // Store selected text
    chrome.storage.local.set({ pendingText: info.selectionText }, () => {
      // Open popup
      chrome.action.openPopup();
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'ANALYZE_TEXT') {
    analyzeText(request.text)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function analyzeText(text) {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim: text }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 4.9 });
chrome.alarms.onAlarm.addListener(() => {
  // Keep alive
});
