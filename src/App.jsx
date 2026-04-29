import React, { useState, useEffect, useCallback } from 'react';
import { Download, FileText, Settings, ShieldAlert, Video, Music, Globe, Trash2, RefreshCw, Filter } from 'lucide-react';
import './App.css';

// Format bytes to human-readable
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get relative time string
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  return Math.floor(diff / 3600000) + 'h ago';
}

// Type icon component
function MediaIcon({ type }) {
  if (type === 'video') return <Video size={14} className="media-type-icon video" />;
  if (type === 'audio') return <Music size={14} className="media-type-icon audio" />;
  if (type === 'embed') return <Globe size={14} className="media-type-icon embed" />;
  return <Globe size={14} className="media-type-icon" />;
}

function App() {
  const [media, setMedia] = useState([]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'video', 'audio'
  const [isScanning, setIsScanning] = useState(true);

  // Fetch captured media from background
  const fetchMedia = useCallback(() => {
    setIsScanning(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        setIsScanning(false);
        return;
      }
      const tabId = tabs[0].id;

      // 1. Get network-captured media from background
      chrome.runtime.sendMessage({ type: "GET_CAPTURED_MEDIA", tabId }, (bgResponse) => {
        const networkMedia = (bgResponse?.media || []).map(m => ({ ...m, _source: 'network' }));

        // 2. Get DOM-scanned media from content script
        chrome.tabs.sendMessage(tabId, { type: "GET_MEDIA" }, (domResponse) => {
          if (chrome.runtime.lastError) {
            // Content script not ready — just use network media
            setMedia(dedup(networkMedia));
            setIsScanning(false);
            return;
          }
          const domMedia = (domResponse?.videos || []).map(m => ({
            url: m.url,
            type: m.type || 'media',
            mime: '',
            size: 0,
            domain: new URL(m.url).hostname,
            timestamp: Date.now(),
            ext: '',
            _source: 'dom'
          }));

          setMedia(dedup([...networkMedia, ...domMedia]));
          setIsScanning(false);
        });
      });
    });
  }, []);

  // Deduplicate by URL
  function dedup(arr) {
    const seen = new Set();
    return arr.filter(m => {
      if (seen.has(m.url)) return false;
      seen.add(m.url);
      return true;
    });
  }

  useEffect(() => {
    fetchMedia();

    // Listen for real-time captures from background
    const listener = (message) => {
      if (message.type === 'MEDIA_CAPTURED') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id === message.tabId) {
            setMedia(prev => {
              if (prev.some(m => m.url === message.entry.url)) return prev;
              return [...prev, { ...message.entry, _source: 'network' }];
            });
          }
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [fetchMedia]);

  const handlePdfClick = () => {
    setIsPdfLoading(true);
    chrome.runtime.sendMessage({ type: "GENERATE_PDF" });
    setTimeout(() => setIsPdfLoading(false), 3000);
  };

  const handleDownload = (item) => {
    chrome.runtime.sendMessage({
      type: "DOWNLOAD_MEDIA",
      url: item.url,
      mime: item.mime,
      ext: item.ext,
      domain: item.domain,
      mediaType: item.type,
    });
  };

  const handleClear = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.runtime.sendMessage({ type: "CLEAR_CAPTURED_MEDIA", tabId: tabs[0].id });
        setMedia([]);
      }
    });
  };

  // Apply filter
  const filtered = filter === 'all' ? media : media.filter(m => m.type === filter);

  // Stats
  const videoCount = media.filter(m => m.type === 'video').length;
  const audioCount = media.filter(m => m.type === 'audio').length;
  const otherCount = media.filter(m => m.type !== 'video' && m.type !== 'audio').length;

  return (
    <div className="bankai-popup fade-in">
      <header className="popup-header">
        <h1 className="accent-text">BANKAI <span style={{color: 'white'}}>SCRIPT</span></h1>
        <div className="header-badges">
          <span className="version-badge">v2.0</span>
          <ShieldAlert size={16} className="status-icon" title="Universal Capture Active" />
        </div>
      </header>

      {/* Action Grid */}
      <div className="action-grid">
        <button className="bankai-button action-btn" onClick={handlePdfClick} disabled={isPdfLoading}>
          <FileText size={16} />
          {isPdfLoading ? 'PROCESSING...' : 'SAVE AS PDF'}
        </button>

        <button className="secondary-button action-btn" onClick={() => chrome.runtime.openOptionsPage()}>
          <Settings size={16} />
          DASHBOARD
        </button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat">
          <Video size={12} />
          <span>{videoCount} Video{videoCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="stat">
          <Music size={12} />
          <span>{audioCount} Audio</span>
        </div>
        <div className="stat">
          <Globe size={12} />
          <span>{otherCount} Other</span>
        </div>
      </div>

      {/* Media Section */}
      <div className="media-section">
        <div className="media-header">
          <h3>CAPTURED MEDIA</h3>
          <div className="media-actions-bar">
            <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-chip ${filter === 'video' ? 'active' : ''}`} onClick={() => setFilter('video')}>
              <Video size={10} /> Vid
            </button>
            <button className={`filter-chip ${filter === 'audio' ? 'active' : ''}`} onClick={() => setFilter('audio')}>
              <Music size={10} /> Aud
            </button>
            <button className="icon-btn-small" onClick={fetchMedia} title="Refresh">
              <RefreshCw size={12} className={isScanning ? 'spin' : ''} />
            </button>
            <button className="icon-btn-small danger" onClick={handleClear} title="Clear all">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="media-list">
          {filtered.length > 0 ? (
            filtered.map((item, i) => (
              <div key={i} className="media-item">
                <div className="media-item-left">
                  <MediaIcon type={item.type} />
                  <div className="media-item-info">
                    <span className="media-label">{item.domain || 'Stream'}</span>
                    <span className="media-meta">
                      {item.type.toUpperCase()}
                      {item.size > 0 && ` • ${formatSize(item.size)}`}
                      {item.mime && ` • ${item.mime.split('/')[1] || ''}`}
                    </span>
                  </div>
                </div>
                <button className="download-btn" onClick={() => handleDownload(item)} title="Download">
                  <Download size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              {isScanning ? (
                <><RefreshCw size={16} className="spin" /> Scanning for media...</>
              ) : (
                <>No media detected yet. Play a video or audio to capture it.</>
              )}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <button className="download-all-btn" onClick={() => filtered.forEach(m => handleDownload(m))}>
            <Download size={14} />
            DOWNLOAD ALL ({filtered.length})
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
