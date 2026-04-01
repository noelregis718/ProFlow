// Content Script for ProFlow

// 1. Clipboard Listener
document.addEventListener('copy', () => {
    // Wait for the copy to finish, then reading selection
    setTimeout(() => {
        const text = window.getSelection().toString();
        if (text && text.trim() !== '') {
            chrome.runtime.sendMessage({
                type: 'NEW_CLIPBOARD_ITEM',
                text: text
            });
        }
    }, 100);
});

// 2. Auto-Save Logic (Forms)
let debounceTimer;
document.addEventListener('input', (e) => {
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    if (isInput) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const url = window.location.href;
            const id = target.id || target.name || target.placeholder || 'form_element';
            const value = target.value || target.innerText;

            chrome.runtime.sendMessage({
                type: 'UPDATE_FORM_DRAFT',
                url: url,
                id: id,
                content: value
            });
        }, 1000); // 1-second debounce
    }
});

// 3. Night Mode Persistance (On Load)
chrome.storage.local.get(['nightMode'], (res) => {
    if (res.nightMode) {
        const style = document.createElement('style');
        style.id = 'proflow-night-mode-filter';
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
});

// 4. Listen for Restore Signal
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RESTORE_DRAFTS') {
        const urlObj = new URL(window.location.href);
        const url = urlObj.origin + urlObj.pathname;

        chrome.storage.local.get(['autoSaveDrafts'], (res) => {
            const drafts = res.autoSaveDrafts || {};
            const urlDrafts = drafts[url] || {};

            Object.entries(urlDrafts).forEach(([id, data]) => {
                // Try to find the element by ID, then Name, then Placeholder
                const el = document.getElementById(id) || 
                           document.querySelector(`[name="${id}"]`) || 
                           document.querySelector(`[placeholder="${id}"]`);
                
                if (el) {
                    if (el.isContentEditable) {
                        el.innerText = data.content;
                    } else {
                        el.value = data.content;
                    }
                    // Trigger input event to notify any site listeners (like React/Vue)
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        });
    }
});
