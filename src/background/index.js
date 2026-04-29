// BankaiScript Background Service Worker
// Universal Media Capture Engine

// ─── In-Memory Media Store ───────────────────────────────────
// Stores captured media URLs per tab: { tabId: [{ url, type, size, mime, timestamp, domain }] }
const capturedMedia = {};

// Known media MIME types and extensions
const VIDEO_MIMES = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/x-flv', 'video/quicktime',
  'video/x-msvideo', 'video/x-matroska', 'video/3gpp', 'video/mpeg',
  'video/mp2t', 'video/x-m4v', 'application/x-mpegURL', 'application/vnd.apple.mpegurl',
  'application/dash+xml'
];

const AUDIO_MIMES = [
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/ogg', 'audio/wav',
  'audio/webm', 'audio/aac', 'audio/flac', 'audio/x-m4a', 'audio/opus'
];

const MEDIA_EXTENSIONS = [
  '.mp4', '.webm', '.ogg', '.mkv', '.avi', '.mov', '.flv', '.m4v', '.3gp',
  '.mp3', '.m4a', '.aac', '.flac', '.wav', '.opus', '.wma',
  '.m3u8', '.mpd', '.ts'
];

// Minimum size threshold (50KB) to filter out tiny tracking pixels and thumbnails
const MIN_SIZE_BYTES = 50 * 1024;

// ─── Helpers ─────────────────────────────────────────────────
function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.substring(pathname.lastIndexOf('.'));
    return ext.toLowerCase();
  } catch { return ''; }
}

function getDomain(url) {
  try { return new URL(url).hostname; }
  catch { return 'unknown'; }
}

function guessMediaType(mime, url) {
  if (VIDEO_MIMES.some(m => mime.includes(m))) return 'video';
  if (AUDIO_MIMES.some(m => mime.includes(m))) return 'audio';
  const ext = getExtension(url);
  if (['.mp4','.webm','.ogg','.mkv','.avi','.mov','.flv','.m4v','.3gp','.m3u8','.mpd','.ts'].includes(ext)) return 'video';
  if (['.mp3','.m4a','.aac','.flac','.wav','.opus','.wma'].includes(ext)) return 'audio';
  return 'media';
}

function getFileExtForMime(mime) {
  const map = {
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogg',
    'video/quicktime': '.mov', 'video/x-matroska': '.mkv',
    'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a',
    'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/webm': '.webm',
    'audio/aac': '.aac', 'audio/flac': '.flac', 'audio/opus': '.opus',
    'audio/x-m4a': '.m4a',
  };
  for (const [key, val] of Object.entries(map)) {
    if (mime.includes(key)) return val;
  }
  return '.mp4';
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, '_').substring(0, 100);
}

function isDuplicate(tabId, url) {
  if (!capturedMedia[tabId]) return false;
  return capturedMedia[tabId].some(m => m.url === url);
}

function addMedia(tabId, entry) {
  if (!capturedMedia[tabId]) capturedMedia[tabId] = [];
  // Cap at 200 entries per tab to prevent memory bloat
  if (capturedMedia[tabId].length >= 200) capturedMedia[tabId].shift();
  capturedMedia[tabId].push(entry);
}

// ─── Network Interception via webRequest ─────────────────────
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Skip our own extension requests
    if (details.tabId < 0) return;

    const contentType = (details.responseHeaders || [])
      .find(h => h.name.toLowerCase() === 'content-type');
    const contentLength = (details.responseHeaders || [])
      .find(h => h.name.toLowerCase() === 'content-length');

    const mime = contentType?.value?.toLowerCase() || '';
    const size = parseInt(contentLength?.value || '0', 10);
    const url = details.url;
    const ext = getExtension(url);

    // Check if this is a media resource by MIME type or file extension
    const isMimeMatch = VIDEO_MIMES.some(m => mime.includes(m)) || AUDIO_MIMES.some(m => mime.includes(m));
    const isExtMatch = MEDIA_EXTENSIONS.includes(ext);

    if (!isMimeMatch && !isExtMatch) return;

    // Skip duplicates
    if (isDuplicate(details.tabId, url)) return;

    // Skip tiny files (likely thumbnails, not real media)
    // But allow M3U8/MPD regardless of size (they are playlists, always small)
    if (size > 0 && size < MIN_SIZE_BYTES && !['.m3u8', '.mpd'].includes(ext)) return;

    const mediaType = guessMediaType(mime, url);
    const domain = getDomain(url);

    const entry = {
      url,
      type: mediaType,
      mime: mime || `unknown/${ext.replace('.', '')}`,
      size,
      domain,
      timestamp: Date.now(),
      ext: ext || getFileExtForMime(mime),
    };

    addMedia(details.tabId, entry);

    // Notify popup if it's open
    chrome.runtime.sendMessage({
      type: 'MEDIA_CAPTURED',
      tabId: details.tabId,
      entry
    }).catch(() => { /* popup not open, ignore */ });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// ─── Tab Cleanup ─────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  delete capturedMedia[tabId];
});

// Cleanup on navigation (new page = new media list)
chrome.webNavigation?.onCommitted?.addListener((details) => {
  if (details.frameId === 0) { // Main frame only
    capturedMedia[details.tabId] = [];
  }
});

// ─── Install Handler ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log("BankaiScript Installed Successfully — Universal Media Capture Active");
});

// ─── PDF Generation ──────────────────────────────────────────
async function capturePDF(tabId) {
  const debuggee = { tabId: tabId };
  try {
    await chrome.debugger.attach(debuggee, "1.3");
    const result = await chrome.debugger.sendCommand(debuggee, "Page.printToPDF", {
      printBackground: true,
      landscape: false,
    });

    // Convert base64 to blob and download
    const blobUrl = `data:application/pdf;base64,${result.data}`;
    await chrome.downloads.download({
      url: blobUrl,
      filename: `Bankai_Page_${Date.now()}.pdf`,
      saveAs: true
    });
  } catch (err) {
    console.error("PDF Generation Error:", err);
  } finally {
    await chrome.debugger.detach(debuggee);
  }
}

// ─── Message Listener ────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // PDF Generation
  if (message.type === "GENERATE_PDF") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) capturePDF(tabs[0].id);
    });
  }

  // Download a specific media URL
  if (message.type === "DOWNLOAD_MEDIA") {
    const ext = message.ext || getFileExtForMime(message.mime || '');
    const domain = message.domain ? sanitizeFilename(message.domain) : 'Bankai';
    const filename = message.filename || `${domain}_${message.mediaType || 'media'}_${Date.now()}${ext}`;

    chrome.downloads.download({
      url: message.url,
      filename: filename,
      saveAs: true
    });
  }

  // Get all captured media for a tab
  if (message.type === "GET_CAPTURED_MEDIA") {
    const tabId = message.tabId;
    const media = capturedMedia[tabId] || [];
    sendResponse({ media });
    return true;
  }

  // Clear captured media for a tab
  if (message.type === "CLEAR_CAPTURED_MEDIA") {
    const tabId = message.tabId;
    capturedMedia[tabId] = [];
    sendResponse({ success: true });
    return true;
  }

  // Content script reports DOM-found media
  if (message.type === "REPORT_DOM_MEDIA") {
    const tabId = sender.tab?.id;
    if (tabId && message.entries) {
      message.entries.forEach(entry => {
        if (!isDuplicate(tabId, entry.url)) {
          addMedia(tabId, { ...entry, source: 'dom', timestamp: Date.now() });
        }
      });
    }
  }

  return true;
});
