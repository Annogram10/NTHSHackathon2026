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
    } else if (request.type === 'SHOW_TOOLTIP') {
      showVouchTooltip(request.text);
      sendResponse({ ok: true });
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

  // ============================================
  // TOOLTIP
  // ============================================
  let _vouchOutsideHandler = null;

  function showVouchTooltip(text) {
    removeVouchTooltip();
    if (_vouchOutsideHandler) {
      document.removeEventListener('mousedown', _vouchOutsideHandler);
      _vouchOutsideHandler = null;
    }

    // Show loading tooltip immediately
    const tooltip = createTooltipEl();
    tooltip.id = 'vouch-tooltip';
    tooltip.innerHTML = buildTooltipHTML(null, text);
    document.body.appendChild(tooltip);
    positionTooltip(tooltip);

    // Dismiss on outside click
    _vouchOutsideHandler = (e) => {
      if (tooltip && !tooltip.contains(e.target)) {
        removeVouchTooltip();
        document.removeEventListener('mousedown', _vouchOutsideHandler);
        _vouchOutsideHandler = null;
      }
    };
    setTimeout(() => document.addEventListener('mousedown', _vouchOutsideHandler), 0);

    // Call background API
    chrome.runtime.sendMessage({ type: 'CHECK_SELECTION', text }, (response) => {
      if (response && response.success && response.data) {
        updateTooltipWithResult(tooltip, text, response.data);
      } else {
        updateTooltipWithError(tooltip, response?.error || 'Analysis failed');
      }
    });
  }

  function createTooltipEl() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
    `;
    return el;
  }

  function positionTooltip(tooltip) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);

      // Keep within viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (left < 8) left = 8;
      if (left + tooltipRect.width > vw - 8) left = vw - tooltipRect.width - 8;
      if (top + tooltipRect.height > vh + window.scrollY - 8) {
        top = rect.top + window.scrollY - tooltipRect.height - 8;
      }

      tooltip.style.top = top + 'px';
      tooltip.style.left = left + 'px';
    } else {
      tooltip.style.top = '100px';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
    }
  }

  function buildTooltipHTML(data, claimText) {
    if (!data) {
      return `
        <div class="vouch-tooltip-inner" style="background:#1e1b2e;color:#e2e0e7;padding:16px 20px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);border:1px solid rgba(139,92,246,0.3);min-width:280px;max-width:360px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="vouch-spinner" style="width:20px;height:20px;border:2px solid rgba(139,92,246,0.3);border-top-color:#8b5cf6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <span style="color:#a1a1aa;">Checking credibility...</span>
          </div>
          <div style="margin-top:8px;font-size:11px;color:#6b6b80;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${escHtml(claimText)}"</div>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
    }

    const score = data.trust_score || 50;
    const verdict = data.verdict || 'unverifiable';
    const verdictClass = verdict.toLowerCase();
    const whyText = data.why_misleading || data.explanation || '';
    const simplified = generateSimplifiedText(verdict, whyText);
    const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

    return `
      <div class="vouch-tooltip-inner" style="background:#1e1b2e;color:#e2e0e7;padding:16px 20px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);border:1px solid rgba(139,92,246,0.3);min-width:280px;max-width:360px;">
        <!-- Header: Verdict + Score -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="vouch-badge vouch-badge-${verdictClass}" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;background:${getVerdictBg(verdict)};color:${getVerdictColor(verdict)};">
              ${getVerdictIconSvg(verdict)} ${verdict}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:80px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
              <div style="width:${score}%;height:100%;background:${scoreColor};border-radius:3px;"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${scoreColor};">${score}</span>
          </div>
        </div>

        <!-- Why misleading / brief explanation -->
        ${whyText ? `<div style="font-size:12px;color:#c4c2cc;margin-bottom:12px;line-height:1.5;">${escHtml(simplified)}</div>` : ''}

        <!-- Actions -->
        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;margin-top:4px;">
          <button id="vouch-close-btn" style="background:none;border:none;color:#6b6b80;cursor:pointer;font-size:11px;padding:2px 0;">Close</button>
          <button id="vouch-more-btn" style="background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);color:#a78bfa;cursor:pointer;font-size:11px;padding:4px 10px;border-radius:6px;">More Details →</button>
        </div>
      </div>
    `;
  }

  function updateTooltipWithResult(tooltip, claimText, data) {
    tooltip.innerHTML = buildTooltipHTML(data, claimText);
    positionTooltip(tooltip);
    attachTooltipHandlers(tooltip, claimText, data);
  }

  function updateTooltipWithError(tooltip, errorMsg) {
    tooltip.innerHTML = `
      <div class="vouch-tooltip-inner" style="background:#1e1b2e;color:#e2e0e7;padding:16px 20px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.4);border:1px solid rgba(239,68,68,0.3);min-width:280px;max-width:360px;">
        <div style="color:#ef4444;font-size:12px;margin-bottom:8px;">Analysis failed</div>
        <div style="color:#6b6b80;font-size:11px;">${escHtml(errorMsg)}</div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <button id="vouch-close-btn" style="background:none;border:none;color:#6b6b80;cursor:pointer;font-size:11px;">Close</button>
        </div>
      </div>
    `;
    positionTooltip(tooltip);
    attachTooltipHandlers(tooltip);
  }

  function attachTooltipHandlers(tooltip, claimText, data) {
    const closeBtn = tooltip.querySelector('#vouch-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', removeVouchTooltip);

    const moreBtn = tooltip.querySelector('#vouch-more-btn');
    if (moreBtn && claimText) {
      moreBtn.addEventListener('click', () => {
        chrome.storage.local.set({ pendingText: claimText, pendingResult: data }, () => {
          removeVouchTooltip();
          chrome.action.openPopup();
        });
      });
    }
  }

  function removeVouchTooltip() {
    const existing = document.getElementById('vouch-tooltip');
    if (existing) existing.remove();
  }

  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getVerdictBg(verdict) {
    const v = (verdict || '').toLowerCase();
    if (v === 'true') return 'rgba(16,185,129,0.15)';
    if (v === 'false') return 'rgba(239,68,68,0.15)';
    if (v === 'misleading') return 'rgba(245,158,11,0.15)';
    return 'rgba(107,107,128,0.15)';
  }

  function getVerdictColor(verdict) {
    const v = (verdict || '').toLowerCase();
    if (v === 'true') return '#10b981';
    if (v === 'false') return '#ef4444';
    if (v === 'misleading') return '#f59e0b';
    return '#6b6b80';
  }

  function getVerdictIconSvg(verdict) {
    const v = (verdict || '').toLowerCase();
    if (v === 'true') return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    if (v === 'false') return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    if (v === 'misleading') return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>';
    return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>';
  }

  function generateSimplifiedText(verdict, explanation) {
    const v = (verdict || '').toLowerCase();
    if (!explanation) return '';
    // Truncate to ~120 chars for tooltip brevity
    const truncated = explanation.length > 120 ? explanation.slice(0, 117) + '...' : explanation;
    return truncated;
  }

  // Expose remove function globally for click-outside dismissal
  window._removeVouchTooltip = removeVouchTooltip;
})();
