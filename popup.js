document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
      
      if (target === 'history') renderHistory();
    });
  });

  // 1. Pomodoro Logic
  const timerDisplay = document.getElementById('timer-display');
  const pomodoroStart = document.getElementById('pomodoro-start');
  const pomodoroReset = document.getElementById('pomodoro-reset');
  const pomodoroStatus = document.getElementById('pomodoro-status');
  const timerPlus = document.getElementById('timer-plus');
  const timerMinus = document.getElementById('timer-minus');

  let currentWorkMins = 25;
  let currentBreakMins = 5;

  const updateTimerUI = (state) => {
    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    pomodoroStart.innerText = state.isActive ? 'Ⅱ' : '▶';
    pomodoroStatus.innerText = state.mode === 'work' ? 'Work Session' : 'Break Time';
    currentWorkMins = state.workDuration || 25;
    currentBreakMins = state.breakDuration || 5;
  };

  setInterval(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'GET_POMODORO_STATE' }, (state) => {
        if (state) updateTimerUI(state);
      });
    }
  }, 500);

  pomodoroStart.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_POMODORO_STATE' }, (state) => {
      const type = state.isActive ? 'PAUSE_POMODORO' : 'START_POMODORO';
      chrome.runtime.sendMessage({ type });
    });
  });

  pomodoroReset.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESET_POMODORO' });
  });

  timerPlus.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_POMODORO_STATE' }, (state) => {
      if (state.mode === 'work') {
        chrome.runtime.sendMessage({ type: 'UPDATE_TIMER_SETTINGS', work: currentWorkMins + 5, break: currentBreakMins });
      } else {
        chrome.runtime.sendMessage({ type: 'UPDATE_TIMER_SETTINGS', work: currentWorkMins, break: currentBreakMins + 5 });
      }
    });
  });

  timerMinus.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_POMODORO_STATE' }, (state) => {
      if (state.mode === 'work') {
        const newVal = Math.max(5, currentWorkMins - 5);
        chrome.runtime.sendMessage({ type: 'UPDATE_TIMER_SETTINGS', work: newVal, break: currentBreakMins });
      } else {
        const newVal = Math.max(1, currentBreakMins - 1);
        chrome.runtime.sendMessage({ type: 'UPDATE_TIMER_SETTINGS', work: currentWorkMins, break: newVal });
      }
    });
  });

  // 2. Auto-Scroll Logic with Persistence
  const scrollToggle = document.getElementById('scroll-toggle');
  const speedBtns = document.querySelectorAll('.speed-btn');
  let currentSpeed = 1;

  // Restore Scroll State
  chrome.storage.local.get(['autoScrollActive', 'autoScrollSpeed'], (res) => {
    currentSpeed = res.autoScrollSpeed || 1;
    scrollToggle.checked = !!res.autoScrollActive;

    // UI: Activate correct speed button
    speedBtns.forEach(btn => {
      if (parseInt(btn.getAttribute('data-speed')) === currentSpeed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // If active, start scrolling immediately
    if (scrollToggle.checked) {
      applyScroll();
    }
  });

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpeed = parseInt(btn.getAttribute('data-speed'));
      chrome.storage.local.set({ autoScrollSpeed: currentSpeed });
      if (scrollToggle.checked) applyScroll();
    });
  });

  scrollToggle.addEventListener('change', (e) => {
    const isScrolling = e.target.checked;
    chrome.storage.local.set({ autoScrollActive: isScrolling });
    applyScroll();
  });

  function applyScroll() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const type = scrollToggle.checked ? 'START_SCROLL' : 'STOP_SCROLL';
        chrome.tabs.sendMessage(tabs[0].id, { type, speed: currentSpeed });
      }
    });
  }

  // 3. Night Mode Toggle
  const nightModeToggle = document.getElementById('night-mode-toggle');
  chrome.storage.local.get(['nightMode'], (res) => {
    nightModeToggle.checked = !!res.nightMode;
  });

  nightModeToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ nightMode: isEnabled });
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
                  html { filter: invert(1) hue-rotate(180deg) !important; background: #000 !important; }
                  img, video, iframe, canvas, [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }
                `;
                document.documentElement.appendChild(style);
              }
            } else if (style) style.remove();
          },
          args: [isEnabled]
        });
      }
    });
  });

  // 4. Color Picker
  const colorPickerBtn = document.getElementById('color-picker-btn');
  colorPickerBtn.addEventListener('click', () => {
    colorPickerBtn.style.background = "rgba(255, 255, 255, 0.2)";
    setTimeout(() => colorPickerBtn.style.background = "", 150);
    chrome.runtime.sendMessage({ type: 'START_COLOR_PICKER' });
  });

  // 5. History Management
  const historyList = document.getElementById('history-list');
  const pomodoroHistoryList = document.getElementById('pomodoro-history-list');

  const renderHistory = () => {
    chrome.storage.local.get(['clipboardHistory', 'pomodoroHistory'], (res) => {
      // Clipboard
      const clips = res.clipboardHistory || [];
      historyList.innerHTML = clips.length ? clips.map(item => `
        <li class="list-item" data-text="${item.replace(/"/g, '&quot;')}">
          <span class="truncate">${item.substring(0, 40)}${item.length > 40 ? '...' : ''}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </li>
      `).join('') : '<li class="empty-state">No copies yet...</li>';

      document.querySelectorAll('#history-list .list-item').forEach(item => {
        item.addEventListener('click', () => {
          const text = item.getAttribute('data-text');
          navigator.clipboard.writeText(text);
          const span = item.querySelector('.truncate');
          const originalText = span.innerText;
          span.innerText = "Copied!";
          setTimeout(() => span.innerText = originalText, 1000);
        });
      });

      // Pomodoro
      const sessions = res.pomodoroHistory || [];
      pomodoroHistoryList.innerHTML = sessions.length ? sessions.map(item => {
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
          <li class="list-item">
            <span class="session-badge ${item.mode}">${item.mode}</span>
            <span class="time-label">${time}</span>
            <span class="badge">${item.duration}m</span>
          </li>
        `;
      }).join('') : '<li class="empty-state">No sessions yet...</li>';
    });
  };

  const clearBtn = document.getElementById('clear-history');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      chrome.storage.local.set({ clipboardHistory: [], pomodoroHistory: [] }, () => {
        renderHistory();
      });
    });
  }
});
