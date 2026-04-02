// Content Script for ProFlow

// 0. Inject Global Styles for Visual Feedback
if (typeof document !== 'undefined' && document.head) {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes proflow-restore-pulse {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); outline: 2px solid transparent; }
            50% { box-shadow: 0 0 0 15px rgba(76, 175, 80, 0); outline: 2px solid #4CAF50; }
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); outline: 2px solid transparent; }
        }
        .proflow-restored {
            animation: proflow-restore-pulse 1.5s ease-out;
            transition: outline 0.3s ease;
        }
        #proflow-scroll-indicator {
            position: fixed; bottom: 20px; right: 20px; 
            background: #3b82f6; color: white; padding: 8px 16px;
            border-radius: 20px; font-size: 12px; font-family: sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 10000;
            pointer-events: none; opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
}

// 1. Universal Auto-Scroll Engine
let isScrolling = false;
let currentScrollSpeed = 1;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_SCROLL') {
        currentScrollSpeed = message.speed || 1;
        if (!isScrolling) {
            isScrolling = true;
            showScrollIndicator();
            requestAnimationFrame(scrollStep);
        }
    } else if (message.type === 'STOP_SCROLL') {
        isScrolling = false;
        hideScrollIndicator();
    }
});

function scrollStep() {
    if (!isScrolling) return;

    // Smart detection of scrollable container
    const scrollContainer = document.scrollingElement || document.documentElement;
    
    // Fallback: If window doesn't scroll, look for large overflow divs (for SPAs)
    window.scrollBy({
        top: currentScrollSpeed,
        left: 0,
        behavior: 'auto'
    });

    requestAnimationFrame(scrollStep);
}

function showScrollIndicator() {
    hideScrollIndicator(); // Clear previous
    const indicator = document.createElement('div');
    indicator.id = 'proflow-scroll-indicator';
    indicator.innerText = '📜 ProFlow: Glide Mode';
    document.body.appendChild(indicator);
}

function hideScrollIndicator() {
    const indicator = document.getElementById('proflow-scroll-indicator');
    if (indicator) indicator.remove();
}

// 2. Auto-Resume Logic (Check storage on load)
if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['autoScrollActive', 'autoScrollSpeed'], (res) => {
        if (res.autoScrollActive) {
            currentScrollSpeed = res.autoScrollSpeed || 1;
            isScrolling = true;
            showScrollIndicator();
            requestAnimationFrame(scrollStep);
        }
    });
}

// 2. Clipboard Listener
document.addEventListener('copy', () => {
    setTimeout(() => {
        // Safety Check INSIDE the timer
        if (!chrome.runtime?.id) return;
        
        const text = window.getSelection().toString();
        if (text && text.trim() !== '') {
            chrome.runtime.sendMessage({
                type: 'NEW_CLIPBOARD_ITEM',
                text: text
            }).catch(() => { /* Context invalidated, ignore silently */ });
        }
    }, 100);
});

// 2. Night Mode Persistence
const applyNightMode = () => {
    if (!chrome.runtime?.id) return;
    chrome.storage.local.get(['nightMode'], (res) => {
        if (res.nightMode) {
            const nightStyle = document.createElement('style');
            nightStyle.id = 'proflow-night-mode-filter';
            nightStyle.textContent = `
                html {
                    filter: invert(1) hue-rotate(180deg) !important;
                    background: #000 !important;
                }
                img, video, iframe, canvas, [style*="background-image"] {
                    filter: invert(1) hue-rotate(180deg) !important;
                }
            `;
            document.documentElement.appendChild(nightStyle);
        }
    }).catch(() => {});
};
applyNightMode();
