// BankaiScript Content Engine — Universal Media Scanner
console.log("BankaiScript Core Engine Active");

// ─── Inject Styles ───────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .bankai-btn-injected {
    background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%) !important;
    color: white !important;
    border: none !important;
    padding: 6px 14px !important;
    border-radius: 6px !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    z-index: 9999 !important;
    margin: 4px !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    text-transform: uppercase !important;
    font-size: 10px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3) !important;
    transition: all 0.2s ease !important;
    letter-spacing: 0.5px !important;
  }
  .bankai-btn-injected:hover {
    background: linear-gradient(135deg, #ff1744 0%, #d32f2f 100%) !important;
    box-shadow: 0 4px 16px rgba(211, 47, 47, 0.5) !important;
    transform: translateY(-1px) !important;
  }
  .bankai-btn-injected:active {
    transform: translateY(0) !important;
  }
  .bankai-floating-badge {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%) !important;
    color: white !important;
    border: none !important;
    width: 48px !important;
    height: 48px !important;
    border-radius: 50% !important;
    font-size: 16px !important;
    font-weight: 900 !important;
    cursor: pointer !important;
    z-index: 99999 !important;
    box-shadow: 0 4px 20px rgba(211, 47, 47, 0.4) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.3s ease !important;
    font-family: 'Inter', system-ui, sans-serif !important;
  }
  .bankai-floating-badge:hover {
    transform: scale(1.1) !important;
    box-shadow: 0 6px 28px rgba(211, 47, 47, 0.6) !important;
  }
  .bankai-floating-badge .bankai-badge-count {
    position: absolute !important;
    top: -4px !important;
    right: -4px !important;
    background: #fff !important;
    color: #d32f2f !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    width: 20px !important;
    height: 20px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
`;
document.head.appendChild(style);

// ─── Universal DOM Media Scanner ─────────────────────────────
function scanDOMMedia() {
  const found = [];

  // 1. All <video> elements
  document.querySelectorAll('video').forEach(v => {
    // Direct src
    if (v.src && !v.src.startsWith('blob:') && !v.src.startsWith('data:')) {
      found.push({ url: v.src, type: 'video', source: 'dom-video' });
    }
    // <source> children
    v.querySelectorAll('source').forEach(s => {
      if (s.src && !s.src.startsWith('blob:') && !s.src.startsWith('data:')) {
        found.push({ url: s.src, type: 'video', source: 'dom-source' });
      }
    });
  });

  // 2. All <audio> elements
  document.querySelectorAll('audio').forEach(a => {
    if (a.src && !a.src.startsWith('blob:') && !a.src.startsWith('data:')) {
      found.push({ url: a.src, type: 'audio', source: 'dom-audio' });
    }
    a.querySelectorAll('source').forEach(s => {
      if (s.src && !s.src.startsWith('blob:') && !s.src.startsWith('data:')) {
        found.push({ url: s.src, type: 'audio', source: 'dom-source' });
      }
    });
  });

  // 3. Open Graph / Twitter Card meta tags (common for video embeds)
  document.querySelectorAll('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"]').forEach(m => {
    const url = m.getAttribute('content');
    if (url && !url.startsWith('blob:')) {
      found.push({ url, type: 'video', source: 'meta-og' });
    }
  });
  document.querySelectorAll('meta[property="og:audio"], meta[property="og:audio:url"]').forEach(m => {
    const url = m.getAttribute('content');
    if (url && !url.startsWith('blob:')) {
      found.push({ url, type: 'audio', source: 'meta-og' });
    }
  });

  // 4. Embedded <iframe> srcs pointing to known video hosts (for reference display only)
  document.querySelectorAll('iframe[src]').forEach(iframe => {
    const src = iframe.src;
    if (/youtube\.com\/embed|player\.vimeo\.com|dailymotion\.com\/embed|streamable\.com|twitch\.tv\/embed/i.test(src)) {
      found.push({ url: src, type: 'embed', source: 'iframe' });
    }
  });

  // Deduplicate
  const unique = [];
  const seen = new Set();
  found.forEach(f => {
    if (!seen.has(f.url)) {
      seen.add(f.url);
      unique.push(f);
    }
  });

  return unique;
}

// Report DOM-found media to background
function reportDOMMedia() {
  const entries = scanDOMMedia();
  if (entries.length > 0) {
    chrome.runtime.sendMessage({
      type: "REPORT_DOM_MEDIA",
      entries: entries.map(e => ({
        url: e.url,
        type: e.type,
        mime: '',
        size: 0,
        domain: window.location.hostname,
        ext: '',
        source: e.source,
      }))
    }).catch(() => {});
  }
}

// ─── YouTube Bridge Listener ─────────────────────────────────
let _bankaiYTUrl = null;
window.addEventListener('BankaiYTData', (e) => {
  if (e.detail && e.detail.url) {
    _bankaiYTUrl = e.detail.url;
  }
});

// ─── Site-Specific Injections ────────────────────────────────

// YouTube: Inject download button into action bar
function injectYouTube() {
  if (!window.location.host.includes('youtube.com')) return;
  const target = document.querySelector('ytd-watch-metadata #top-level-buttons-computed') ||
                 document.querySelector('#info #menu-container #top-level-buttons-computed');

  if (target && !document.querySelector('#bankai-yt-download')) {
    const btn = document.createElement('button');
    btn.id = 'bankai-yt-download';
    btn.className = 'bankai-btn-injected';
    btn.innerHTML = '⬇ BANKAI DL';
    btn.onclick = () => {
      if (_bankaiYTUrl) {
        chrome.runtime.sendMessage({
          type: "DOWNLOAD_MEDIA",
          url: _bankaiYTUrl,
          filename: `YouTube_${Date.now()}.mp4`,
          mediaType: 'video',
          domain: 'youtube.com',
          referer: window.location.href
        });
      } else {
        alert("Bankai: Capturing stream... ensure the video is playing.");
      }
    };
    target.appendChild(btn);
  }
}

// Instagram: Inject download button near heart icon
function injectInstagram() {
  if (!window.location.host.includes('instagram.com')) return;

  const heartIcons = document.querySelectorAll('svg[aria-label="Like"], svg[aria-label="Unlike"]');

  heartIcons.forEach(svg => {
    const iconContainer = svg.closest('div') || svg.parentElement;
    const actionBar = iconContainer.parentElement;

    if (actionBar && !actionBar.querySelector('.bankai-insta-download')) {
      const btn = document.createElement('button');
      btn.className = 'bankai-btn-injected bankai-insta-download';
      btn.innerHTML = '⬇ DL';
      btn.style.scale = '0.8';
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const context = actionBar.closest('article') || actionBar.closest('main') || actionBar.closest('div[role="dialog"]') || document;
        const video = context.querySelector('video');
        if (video && video.src) {
          chrome.runtime.sendMessage({
            type: "DOWNLOAD_MEDIA",
            url: video.src,
            filename: `Instagram_${Date.now()}.mp4`,
            mediaType: 'video',
            domain: 'instagram.com'
          });
        } else {
          // Try to find image if no video
          const img = context.querySelector('img[srcset], img[src*="cdninstagram"]');
          if (img) {
            const imgUrl = img.srcset ? img.srcset.split(',').pop().trim().split(' ')[0] : img.src;
            chrome.runtime.sendMessage({
              type: "DOWNLOAD_MEDIA",
              url: imgUrl,
              filename: `Instagram_${Date.now()}.jpg`,
              mediaType: 'image',
              domain: 'instagram.com'
            });
          }
        }
      };
      actionBar.appendChild(btn);
    }
  });
}

// Twitter/X: Inject near the video
function injectTwitter() {
  if (!window.location.host.includes('x.com') && !window.location.host.includes('twitter.com')) return;

  document.querySelectorAll('video').forEach(video => {
    const container = video.closest('div[data-testid="videoPlayer"]') || video.parentElement;
    if (container && !container.querySelector('.bankai-twitter-download')) {
      const btn = document.createElement('button');
      btn.className = 'bankai-btn-injected bankai-twitter-download';
      btn.innerHTML = '⬇ DL';
      btn.style.position = 'absolute';
      btn.style.top = '8px';
      btn.style.right = '8px';
      btn.style.zIndex = '99999';
      container.style.position = container.style.position || 'relative';
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (video.src && !video.src.startsWith('blob:')) {
          chrome.runtime.sendMessage({
            type: "DOWNLOAD_MEDIA",
            url: video.src,
            filename: `Twitter_${Date.now()}.mp4`,
            mediaType: 'video',
            domain: 'x.com'
          });
        } else {
          alert("Bankai: This video uses encrypted streaming. Use popup for captured streams.");
        }
      };
      container.appendChild(btn);
    }
  });
}

// Generic: For any other site, inject overlay buttons on video/audio elements
function injectGenericOverlays() {
  const host = window.location.host;
  // Skip sites with dedicated injectors
  if (host.includes('youtube.com') || host.includes('instagram.com') || host.includes('x.com') || host.includes('twitter.com')) return;

  // Videos
  document.querySelectorAll('video').forEach(video => {
    const container = video.parentElement;
    if (container && !container.querySelector('.bankai-generic-download')) {
      const btn = document.createElement('button');
      btn.className = 'bankai-btn-injected bankai-generic-download';
      btn.innerHTML = '⬇ BANKAI';
      btn.style.position = 'absolute';
      btn.style.top = '8px';
      btn.style.left = '8px';
      btn.style.zIndex = '99999';
      container.style.position = container.style.position || 'relative';
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (video.src && !video.src.startsWith('blob:') && !video.src.startsWith('data:')) {
          chrome.runtime.sendMessage({
            type: "DOWNLOAD_MEDIA",
            url: video.src,
            filename: `${host}_video_${Date.now()}.mp4`,
            mediaType: 'video',
            domain: host
          });
        } else {
          alert("Bankai: This video uses blob/encrypted streaming.\nOpen the Bankai popup to see captured network streams.");
        }
      };
      container.appendChild(btn);
    }
  });

  // Audio
  document.querySelectorAll('audio').forEach(audio => {
    const container = audio.parentElement;
    if (container && !container.querySelector('.bankai-generic-audio-download')) {
      const btn = document.createElement('button');
      btn.className = 'bankai-btn-injected bankai-generic-audio-download';
      btn.innerHTML = '♫ BANKAI DL';
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (audio.src && !audio.src.startsWith('blob:') && !audio.src.startsWith('data:')) {
          chrome.runtime.sendMessage({
            type: "DOWNLOAD_MEDIA",
            url: audio.src,
            filename: `${host}_audio_${Date.now()}.mp3`,
            mediaType: 'audio',
            domain: host
          });
        } else {
          alert("Bankai: Open the Bankai popup to see captured audio streams.");
        }
      };
      container.appendChild(btn);
    }
  });
}

// ─── Message Listener for Popup Queries ──────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MEDIA") {
    // Return DOM-scanned media for backward compat
    sendResponse({ videos: scanDOMMedia() });
  }
  return true;
});

// ─── Main Runner ─────────────────────────────────────────────
function run() {
  chrome.storage.local.get(['bankai_scripts'], (result) => {
    const scripts = result.bankai_scripts || [];
    const ytEnabled = scripts.find(s => s.id === 'yt_opt')?.enabled ?? true;
    const instaEnabled = scripts.find(s => s.id === 'insta_dl')?.enabled ?? true;

    if (ytEnabled) injectYouTube();
    if (instaEnabled) injectInstagram();
    injectTwitter();
    injectGenericOverlays();
    reportDOMMedia();
  });
}

// Observe DOM mutations for SPAs (React/Vue/Angular routers)
const observer = new MutationObserver(run);
observer.observe(document.body, { childList: true, subtree: true });
run();
