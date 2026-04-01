document.addEventListener('DOMContentLoaded', () => {
  // Tabs Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // Night Mode Toggle
  const nightModeToggle = document.getElementById('night-mode-toggle');

  // Load saved state (with safety check for file:// preview)
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['nightMode'], (res) => {
      nightModeToggle.checked = !!res.nightMode;
    });
  }

  nightModeToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ nightMode: isEnabled });

      // Send message to current tab to apply/remove filter
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (enabled) => {
              const filterId = 'proflow-night-mode-filter';
              let style = document.getElementById(filterId);

              if (enabled) {
                if (!style) {
                  style = document.createElement('style');
                  style.id = filterId;
                  style.textContent = `
                    html {
                      filter: invert(1) hue-rotate(180deg) !important;
                      background: #000 !important;
                    }
                    img, video, iframe, canvas, [style*="background-image"] {
                      filter: invert(1) hue-rotate(180deg) !important;
                    }
                  `;
                  document.documentElement.appendChild(style);
                }
              } else {
                if (style) style.remove();
              }
            },
            args: [isEnabled]
          });
        }
      });
    } else {
      console.warn("Chrome Extension APIs are only available when loaded as an extension.");
    }
  });

  // Color Picker (Signal Background to start)
  const colorPickerBtn = document.getElementById('color-picker-btn');
  colorPickerBtn.addEventListener('click', () => {
    console.log("Color Picker Signal Sent");
    
    // Immediate Visual Pulse
    colorPickerBtn.style.background = "rgba(255, 255, 255, 0.2)";
    setTimeout(() => colorPickerBtn.style.background = "", 150);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'START_COLOR_PICKER' });
    } else {
      alert("Click registered! (But you are in Preview Mode, load into Chrome to see the glass)");
    }
  });

  // Load and Render Clipboard History
  const historyList = document.getElementById('history-list');

  const renderHistory = () => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      historyList.innerHTML = '<li class="empty-state">Preview Mode: Extension APIs disabled.</li>';
      return;
    }

    chrome.storage.local.get(['clipboardHistory'], (res) => {
      const history = res.clipboardHistory || [];
      if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-state">No copies yet...</li>';
        return;
      }

      historyList.innerHTML = history.map((item, index) => `
        <li class="list-item" data-text="${item.replace(/"/g, '&quot;')}">
          <span class="truncate">${item.substring(0, 40)}${item.length > 40 ? '...' : ''}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy" style="opacity: 0.5;"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </li>
      `).join('');

      // Add click to copy back
      document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
          const text = item.getAttribute('data-text');
          navigator.clipboard.writeText(text);

          const span = item.querySelector('span');
          const originalText = span.innerText;
          span.innerText = "Copied!";
          setTimeout(() => span.innerText = originalText, 1000);
        });
      });
    });
  };

  renderHistory();

  // Clear History
  const clearBtn = document.getElementById('clear-history');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ clipboardHistory: [] }, () => {
          renderHistory();
        });
      }
    });
  }

  // Check saved forms count (status)
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      
      const urlObj = new URL(tabs[0].url);
      const currentUrl = urlObj.origin + urlObj.pathname;

      chrome.storage.local.get(['autoSaveDrafts'], (res) => {
        const drafts = res.autoSaveDrafts || {};
        const urlDrafts = drafts[currentUrl] || {};
        const draftCount = Object.keys(urlDrafts).length;

        const saveCount = document.getElementById('save-count');
        const restoreBtn = document.getElementById('restore-btn');
        const statusText = document.getElementById('save-status-text');

        if (draftCount > 0) {
          saveCount.style.display = 'none';
          restoreBtn.style.display = 'block';
          statusText.innerText = `${draftCount} field(s) saved!`;
        } else {
          saveCount.innerText = 'Idle';
          saveCount.style.display = 'block';
          restoreBtn.style.display = 'none';
          statusText.innerText = 'Monitoring all forms...';
        }
      });
    });

    // Handle Restore Button click
    document.getElementById('restore-btn').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'RESTORE_DRAFTS' });
          alert("ProFlow: Form data restored! 📝");
          window.close(); // Close popup after restore
        }
      });
    });
  }
});
