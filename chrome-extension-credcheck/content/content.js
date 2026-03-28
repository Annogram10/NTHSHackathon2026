/**
 * Vouch Chrome Extension - Content Script
 * Injected into web pages for text extraction and claim detection
 */

(function() {
  'use strict';

  if (window._vouchInjected) return;
  window._vouchInjected = true;

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_CONTENT') {
      const content = extractPageContent();
      sendResponse({ content });
    } else if (request.type === 'GET_PAGE_INFO') {
      sendResponse({
        title: document.title,
        url: window.location.href,
        domain: window.location.hostname.replace('www.', ''),
        text: extractReadableText(),
      });
    } else if (request.type === 'GET_SELECTION') {
      sendResponse({ selection: window.getSelection().toString().trim() });
    }
    return true;
  });

  function extractReadableText() {
    // Try to get selected text first
    const selection = window.getSelection()?.toString()?.trim();
    if (selection && selection.length > 20) {
      return selection;
    }

    // Try article-like containers
    const articleSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.entry-content',
      '.article-body',
      '.story-body',
      '#article-body',
      '.article__body',
    ];

    for (const selector of articleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim().length > 100) {
        return el.innerText.trim().slice(0, 5000);
      }
    }

    // Get all paragraphs and join
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.innerText.trim())
      .filter(t => t.length > 40)
      .slice(0, 50);

    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }

    // Fallback
    return document.body.innerText.trim().slice(0, 3000);
  }

  function extractPageContent() {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname.replace('www.', ''),
      text: extractReadableText(),
    };
  }

  // Notify background that content script is ready
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch(() => {
    // Background may not be ready yet, ignore
  });
})();
