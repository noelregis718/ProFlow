// Service Worker (Background Script)

// Initialize Storage on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['clipboardHistory', 'autoSaveDrafts', 'nightMode'], (res) => {
    if (!res.clipboardHistory) chrome.storage.local.set({ clipboardHistory: [] });
    if (!res.autoSaveDrafts) chrome.storage.local.set({ autoSaveDrafts: {} });
    if (res.nightMode === undefined) chrome.storage.local.set({ nightMode: false });
  });
});

// Handle messages from content.js or popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_CLIPBOARD_ITEM') {
    updateClipboardHistory(message.text);
  } else if (message.type === 'UPDATE_FORM_DRAFT') {
    updateFormDraft(message.url, message.id, message.content);
  } else if (message.type === 'START_COLOR_PICKER') {
    startPicker();
  }
});

// Color Picker Trigger from Background (Click-to-Pick Method)
async function startPicker() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Create a temporary overlay to catch a user click
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;cursor:crosshair;background:rgba(0,0,0,0.05);';
      overlay.id = 'proflow-picker-overlay';
      
      const label = document.createElement('div');
      label.innerText = 'Click anywhere to start picking a color...';
      label.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#3b82f6;color:white;padding:10px 20px;border-radius:20px;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:1000000;';
      
      document.body.appendChild(overlay);
      document.body.appendChild(label);

      overlay.addEventListener('click', async () => {
        // Now we have a REAL user gesture!
        try {
          const eyeDropper = new EyeDropper();
          const result = await eyeDropper.open();
          const hex = result.sRGBHex;

          // Cleanup
          overlay.remove();
          label.remove();

          // Clipboard Copy
          const el = document.createElement('textarea');
          el.value = hex;
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);

          chrome.runtime.sendMessage({ type: 'NEW_CLIPBOARD_ITEM', text: hex });
          alert("Color " + hex + " copied to clipboard!");
        } catch (e) {
          overlay.remove();
          label.remove();
        }
      }, { once: true });
    }
  });
}

// Clipboard History Logic
async function updateClipboardHistory(text) {
  if (!text || text.trim() === '') return;
  
  chrome.storage.local.get(['clipboardHistory'], (res) => {
    let history = res.clipboardHistory || [];
    
    // Check if duplicate of last item
    if (history.length > 0 && history[0] === text) return;

    // Add to top, keep last 20 items
    history.unshift(text);
    if (history.length > 20) history.pop();

    chrome.storage.local.set({ clipboardHistory: history });
  });
}

// Auto-Save Drafts Logic
async function updateFormDraft(link, id, content) {
  // Normalize URL (ignore fragments/queries)
  const urlObj = new URL(link);
  const url = urlObj.origin + urlObj.pathname;

  chrome.storage.local.get(['autoSaveDrafts'], (res) => {
    const drafts = res.autoSaveDrafts || {};
    if (!drafts[url]) drafts[url] = {};
    
    drafts[url][id] = {
      content: content,
      timestamp: Date.now()
    };

    chrome.storage.local.set({ autoSaveDrafts: drafts });
  });
}
