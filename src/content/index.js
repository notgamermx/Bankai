// BankaiScript Content Engine
console.log("BankaiScript Core Engine Active");

// 1. Inject Styles
const style = document.createElement('style');
style.textContent = `
  .bankai-btn-injected {
    background: #d32f2f !important;
    color: white !important;
    border: none !important;
    padding: 6px 12px !important;
    border-radius: 4px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    z-index: 9999 !important;
    margin: 4px !important;
    font-family: Inter, sans-serif !important;
    text-transform: uppercase !important;
    font-size: 10px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
`;
document.head.appendChild(style);

// 2. Media Detection Logic
function findVideos() {
  const videos = Array.from(document.querySelectorAll('video'));
  return videos.map(v => ({
    src: v.src || v.querySelector('source')?.src,
    type: 'video'
  })).filter(s => s.src && !s.src.startsWith('blob:'));
}

// 3. YouTube Injection
let _bankaiYTUrl = null;
window.addEventListener('BankaiYTData', (e) => {
  if (e.detail && e.detail.url) {
    _bankaiYTUrl = e.detail.url;
  }
});

function injectYouTube() {
  if (!window.location.host.includes('youtube.com')) return;
  const target = document.querySelector('ytd-watch-metadata #top-level-buttons-computed') || 
                 document.querySelector('#info #menu-container #top-level-buttons-computed');
  
  if (target && !document.querySelector('#bankai-yt-download')) {
    const btn = document.createElement('button');
    btn.id = 'bankai-yt-download';
    btn.className = 'bankai-btn-injected';
    btn.innerHTML = 'BANKAI DL';
    btn.onclick = () => {
      if (_bankaiYTUrl) {
        chrome.runtime.sendMessage({
          type: "DOWNLOAD_MEDIA",
          url: _bankaiYTUrl,
          filename: `YouTube_${Date.now()}.mp4`
        });
      } else {
        alert("Capturing direct stream... please ensure the video is playing.");
      }
    };
    target.appendChild(btn);
  }
}

// 4. Instagram Injection (Improved)
function injectInstagram() {
  if (!window.location.host.includes('instagram.com')) return;
  
  // Find all action bars (Like/Comment/Share) - both horizontal and vertical
  // We target the individual action icon containers
  const heartIcons = document.querySelectorAll('svg[aria-label="Like"], svg[aria-label="Unlike"]');
  
  heartIcons.forEach(svg => {
    const iconContainer = svg.closest('div') || svg.parentElement;
    const actionBar = iconContainer.parentElement;
    
    if (actionBar && !actionBar.querySelector('.bankai-insta-download')) {
      const btn = document.createElement('button');
      btn.className = 'bankai-btn-injected bankai-insta-download';
      btn.innerHTML = 'DL';
      btn.style.scale = '0.8';
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Find the video in the parent context
        const context = actionBar.closest('article') || actionBar.closest('main') || actionBar.closest('div[role="dialog"]') || document;
        const video = context.querySelector('video');
        if (video && video.src) {
           chrome.runtime.sendMessage({
            type: "DOWNLOAD_MEDIA",
            url: video.src,
            filename: `Instagram_${Date.now()}.mp4`
          });
        }
      };
      actionBar.appendChild(btn);
    }
  });
}

// 5. Message Listener for Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MEDIA") {
    sendResponse({ videos: findVideos() });
  }
  return true;
});

// 6. Check Preferences and Inject
function run() {
  chrome.storage.local.get(['bankai_scripts'], (result) => {
    const scripts = result.bankai_scripts || [];
    const ytEnabled = scripts.find(s => s.id === 'yt_opt')?.enabled ?? true;
    const instaEnabled = scripts.find(s => s.id === 'insta_dl')?.enabled ?? true;

    if (ytEnabled) injectYouTube();
    if (instaEnabled) injectInstagram();
  });
}

const observer = new MutationObserver(run);
observer.observe(document.body, { childList: true, subtree: true });
run();
