// BankaiScript - Main World Bridge (YouTube Stream Extractor)
// Runs in MAIN world to access page JS variables and intercept network responses

(function() {
  const BANKAI_TAG = "[Bankai Bridge]";
  let bestStreamUrl = null;

  // ─── Extract streams from YouTube player response ──────────
  function extractStreams(playerResponse) {
    if (!playerResponse) return null;

    // Parse if string
    let data = playerResponse;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }

    const sd = data.streamingData;
    if (!sd) return null;

    // Prefer combined formats (video+audio in one file, usually 360p/720p)
    const formats = sd.formats || [];
    const best = formats.find(f => f.url);
    if (best) return best.url;

    // Fallback to adaptive (video-only or audio-only, higher quality)
    const adaptive = sd.adaptiveFormats || [];
    // Sort by bitrate descending, prefer ones with direct URL
    const withUrl = adaptive.filter(f => f.url).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    if (withUrl.length > 0) return withUrl[0].url;

    return null;
  }

  function broadcastUrl(url) {
    if (url && url !== bestStreamUrl) {
      bestStreamUrl = url;
      window.dispatchEvent(new CustomEvent('BankaiYTData', {
        detail: { url: url }
      }));
      console.log(BANKAI_TAG, "Stream URL captured ✓");
    }
  }

  // ─── Method 1: Hook into ytInitialPlayerResponse ───────────
  function checkInitialResponse() {
    const pr = window.ytInitialPlayerResponse;
    const url = extractStreams(pr);
    if (url) broadcastUrl(url);
  }

  // ─── Method 2: Hook fetch() to intercept /youtubei/v1/player ─
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    try {
      const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      
      if (requestUrl.includes('/youtubei/v1/player') || requestUrl.includes('player?key=')) {
        // Clone the response so we can read it without consuming
        const clone = response.clone();
        clone.json().then(json => {
          const url = extractStreams(json);
          if (url) broadcastUrl(url);
        }).catch(() => {});
      }
    } catch (e) { /* silent */ }
    
    return response;
  };

  // ─── Method 3: Hook XMLHttpRequest for legacy player calls ──
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._bankaiUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    const xhr = this;
    const url = this._bankaiUrl || '';
    
    if (url.includes('/youtubei/v1/player') || url.includes('player?key=') || url.includes('get_video_info')) {
      xhr.addEventListener('load', function() {
        try {
          const json = JSON.parse(xhr.responseText);
          const streamUrl = extractStreams(json);
          if (streamUrl) broadcastUrl(streamUrl);
        } catch { /* silent */ }
      });
    }
    
    return originalSend.apply(this, arguments);
  };

  // ─── Method 4: Watch for ytplayer.config (embedded/older) ──
  function checkYtPlayerConfig() {
    try {
      // Modern yt app
      const app = document.querySelector('ytd-app');
      if (app && app.__data) {
        const playerData = app.__data?.playerResponse || app.__data?.player?.playerResponse;
        const url = extractStreams(playerData);
        if (url) broadcastUrl(url);
      }
    } catch { /* silent */ }

    try {
      // Legacy ytplayer config
      if (window.ytplayer?.config?.args) {
        const raw = window.ytplayer.config.args.raw_player_response || window.ytplayer.config.args.player_response;
        const url = extractStreams(raw);
        if (url) broadcastUrl(url);
      }
    } catch { /* silent */ }
  }

  // ─── Method 5: Scan page source for embedded player data ───
  function checkPageSource() {
    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        // Look for ytInitialPlayerResponse assignment
        const match = text.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
        if (match) {
          try {
            const json = JSON.parse(match[1]);
            const url = extractStreams(json);
            if (url) broadcastUrl(url);
          } catch { /* silent */ }
          break;
        }
      }
    } catch { /* silent */ }
  }

  // ─── Polling: Run all methods periodically ─────────────────
  function pollAll() {
    checkInitialResponse();
    checkYtPlayerConfig();
  }

  // Run immediately
  checkPageSource();
  pollAll();

  // Poll every 2 seconds
  setInterval(pollAll, 2000);

  // Also run on YouTube SPA navigation
  window.addEventListener('yt-navigate-finish', () => {
    bestStreamUrl = null; // Reset for new video
    setTimeout(pollAll, 500);
    setTimeout(pollAll, 1500);
    setTimeout(pollAll, 3000);
  });

  console.log(BANKAI_TAG, "Bridge active — monitoring fetch, XHR, and player config");
})();
