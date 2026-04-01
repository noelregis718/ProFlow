# 🚀 ProFlow: Master Productivity Extension

**ProFlow** is a premium, all-in-one browser toolkit designed for developers, designers, and power users. It merges four high-utility productivity features into a single, sleek, glassmorphic interface with **zero external dependencies** and **100% local data storage**.

---

## ✨ Features

### 🌑 Universal Night Mode
Tired of blinding white websites? ProFlow uses a high-intensity "Nuclear" CSS filter to instantly darken any page. 
- **Smart Logic**: Unlike simple inverters, ProFlow preserves the colors of images, videos, and icons to keep the web looking beautiful.
- **Persistent**: Remembers your preference for every page you visit.

### 🔍 Advanced Color Picker
A designer's best friend. ProFlow uses a "Click-to-Pick" overlay to satisfy Chrome's strict security, ensuring the magnifying glass opens reliably every time.
- **Precision**: Pixel-perfect color selection.
- **Copy-Safe**: Hex codes are instantly copied to your clipboard and added to your history.

### 📝 Smart Auto-Save & Restore
Never lose your work again. ProFlow monitors every form and text box you type in.
- **Time Machine**: If you refresh the page or it crashes, just open ProFlow and click **"Restore"** to bring your text back!
- **Normalized URL Tracking**: Smart enough to find your drafts even if the page URL has fragments (#) or trackers.

### 📋 Clipboard History
A local vault for your snippets. 
- **Last 20 Copies**: Keeps track of the last 20 things you "Copied" while browsing.
- **Click-to-Paste**: Need that link you copied 10 minutes ago? Just click it in the History tab to copy it back!

---

## 🛠️ Installation (Developer Mode)

Since this is a custom-built extension, you can load it directly into your browser:

1.  **Download/Clone** this repository to your local machine.
2.  Open **Google Chrome** (or any Chromium browser like Edge/Brave).
3.  Navigate to `chrome://extensions/`.
4.  Switch on **Developer mode** (top-right corner).
5.  Click the **Load unpacked** button.
6.  Select the `Browser Extension` folder.
7.  **Pin it!** Click the 🧩 puzzle icon and pin ProFlow to your toolbar for the best experience.

---

## 📂 Project Architecture

- `manifest.json`: Configuration, permissions (V3), and host rules.
- `popup.html` & `popup.css`: Premium UI with glassmorphism and embedded SVGs.
- `popup.js`: Dashboard logic and user interaction handling.
- `background.js`: Persistent service worker for storage, sync, and script injection.
- `content.js`: Real-time page listeners for clipboard and auto-save events.
- `icons/`: High-resolution, professional assets.

---

## 🛡️ Privacy First

ProFlow is built with a **Privacy-First** philosophy.
- **No Servers**: We do not send your data anywhere.
- **Local Storage**: All form drafts, clipboard history, and settings are stored 100% locally on your machine using `chrome.storage.local`.

---

## 📜 License

Created with ❤️ by Antigravity AI. Feel free to use and modify for your personal productivity!
