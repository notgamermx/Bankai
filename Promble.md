# Technical Challenges & Solutions (Promble.md)

Developing a premium userscript manager like BankaiScript in the Manifest V3 era involves several "prombles" that require creative engineering. Here is how we tackled them.

## 1. The MAIN World Injection Barrier
**Problem:** Manifest V3 restricts content scripts from accessing the page's global `window` variables. This prevents us from intercepting internal video players (like YouTube's `ytplayer`) that store stream URLs in memory.

**Solution:** We utilized the new `world: MAIN` capability in `manifest.json`. This allows a specific script (`mainBridge.js`) to run directly in the page context, where it can hook into player APIs and broadcast findings back to our extension.

## 2. YouTube's Content Security Policy (CSP)
**Problem:** YouTube prevents the loading of external scripts and certain communication methods to mitigate XSS attacks.

**Solution:** Instead of trying to inject external assets, we bundle all logic locally and use direct DOM messaging via `window.dispatchEvent` to move data across the security boundary between the MAIN world and the ISOLATED world (our content script).

## 3. Service Worker Dormancy
**Problem:** In Manifest V3, background pages are replaced by Service Workers which can hibernate after a few seconds of inactivity. This breaks long-running tasks like monitoring network requests or managing multi-step PDF generation.

**Solution:** We implemented an event-driven architecture using `chrome.storage` for state persistence and asynchronous messaging. This ensures the extension can "wake up," perform its task, and return to sleep without losing the user's current session or download progress.

## 4. PDF Generation Layout
**Problem:** Saving modern SPAs (Single Page Applications) to PDF often results in broken layouts or cut-off content.

**Solution:** Bankai uses a custom CSS injection technique that optimizes the page specifically for the print medium (`@media print`) before capturing the blob, ensuring the "Premium" look is maintained even on paper.
