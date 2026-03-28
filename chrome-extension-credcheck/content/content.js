/**
 * CredCheck Content Script
 * Injected into web pages for content extraction
 */

(function() {
  'use strict';
  if (window.credCheckInjected) return;
  window.credCheckInjected = true;

  console.log('CredCheck content script loaded');

  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_CONTENT') {
      const content = extractPageContent();
      sendResponse({ content });
    }
    if (request.type === 'GET_SELECTION') {
      sendResponse({ selection: window.getSelection().toString() });
    }
  });

  function extractPageContent() {
    // Article content selectors
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.entry-content',
      '.article-body',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        return {
          title: document.title,
          url: window.location.href,
          text: el.innerText.trim().slice(0, 3000),
        };
      }
    }

    return {
      title: document.title,
      url: window.location.href,
      text: document.body.innerText.trim().slice(0, 3000),
    };
  }
})();
