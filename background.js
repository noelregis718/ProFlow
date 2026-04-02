// Service Worker (Background Script)

// 3. Pomodoro Timer State
let pomodoro = {
  timeLeft: 25 * 60,
  isActive: false,
  timerId: null,
  mode: 'work', // 'work' or 'break'
  workDuration: 25,
  breakDuration: 5
};

// Initialize Storage on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['clipboardHistory', 'nightMode', 'workDuration', 'breakDuration', 'pomodoroHistory', 'autoScrollActive', 'autoScrollSpeed'], (res) => {
    if (!res.clipboardHistory) chrome.storage.local.set({ clipboardHistory: [] });
    if (!res.pomodoroHistory) chrome.storage.local.set({ pomodoroHistory: [] });
    if (res.nightMode === undefined) chrome.storage.local.set({ nightMode: false });
    if (res.autoScrollActive === undefined) chrome.storage.local.set({ autoScrollActive: false });
    if (!res.autoScrollSpeed) chrome.storage.local.set({ autoScrollSpeed: 1 });
    
    // Sync starting durations
    pomodoro.workDuration = res.workDuration || 25;
    pomodoro.breakDuration = res.breakDuration || 5;
    pomodoro.timeLeft = pomodoro.workDuration * 60;
    
    if (!res.workDuration) chrome.storage.local.set({ workDuration: 25 });
    if (!res.breakDuration) chrome.storage.local.set({ breakDuration: 5 });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_CLIPBOARD_ITEM') {
    updateClipboardHistory(message.text);
  } else if (message.type === 'START_COLOR_PICKER') {
    startPicker();
  } else if (message.type === 'START_POMODORO') {
    startPomodoro();
  } else if (message.type === 'PAUSE_POMODORO') {
    pausePomodoro();
  } else if (message.type === 'RESET_POMODORO') {
    resetPomodoro();
  } else if (message.type === 'GET_POMODORO_STATE') {
    sendResponse(pomodoro);
  } else if (message.type === 'UPDATE_TIMER_SETTINGS') {
    updateTimerSettings(message.work, message.break);
  }
});

function updateTimerSettings(work, breakMins) {
  pomodoro.workDuration = work;
  pomodoro.breakDuration = breakMins;
  chrome.storage.local.set({ workDuration: work, breakDuration: breakMins });
  if (!pomodoro.isActive) resetPomodoro();
}

function startPomodoro() {
  if (pomodoro.isActive) return;
  pomodoro.isActive = true;
  pomodoro.timerId = setInterval(() => {
    pomodoro.timeLeft--;
    if (pomodoro.timeLeft <= 0) {
      clearInterval(pomodoro.timerId);
      pomodoro.isActive = false;
      const finishedMode = pomodoro.mode;
      logPomodoroSession(finishedMode);
      
      // Auto-switch mode
      pomodoro.mode = (finishedMode === 'work') ? 'break' : 'work';
      resetPomodoro();
      notifyPomodoroEnd(finishedMode);
    }
  }, 1000);
}

function pausePomodoro() {
  clearInterval(pomodoro.timerId);
  pomodoro.isActive = false;
}

function resetPomodoro() {
  pausePomodoro();
  const mins = (pomodoro.mode === 'work') ? pomodoro.workDuration : pomodoro.breakDuration;
  pomodoro.timeLeft = mins * 60;
}

function logPomodoroSession(mode) {
  chrome.storage.local.get(['pomodoroHistory'], (res) => {
    let history = res.pomodoroHistory || [];
    history.unshift({
      mode: mode,
      timestamp: Date.now(),
      duration: (mode === 'work') ? pomodoro.workDuration : pomodoro.breakDuration
    });
    if (history.length > 20) history.pop();
    chrome.storage.local.set({ pomodoroHistory: history });
  });
}

function notifyPomodoroEnd(mode) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'ProFlow Timer Up!',
    message: mode === 'work' ? 'Time for a break! ☕' : 'Back to work! 🚀',
    priority: 2
  });
}

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

