import React, { useState, useEffect } from 'react';
import { Download, FileText, Settings, ShieldAlert } from 'lucide-react';
import './App.css';

function App() {
  const [detectedVideos, setDetectedVideos] = useState([]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    // Request media from content script on popup open
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "GET_MEDIA" }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("Bankai: Content script not ready yet or restricted page.");
            return;
          }
          if (response && response.videos) {
            setDetectedVideos(response.videos);
          }
        });
      }
    });
  }, []);

  const handlePdfClick = () => {
    setIsPdfLoading(true);
    chrome.runtime.sendMessage({ type: "GENERATE_PDF" });
    setTimeout(() => setIsPdfLoading(false), 3000);
  };

  const handleDownload = (url) => {
    chrome.runtime.sendMessage({
      type: "DOWNLOAD_MEDIA",
      url: url,
      filename: `Bankai_Media_${Date.now()}.mp4`
    });
  };

  return (
    <div className="bankai-popup fade-in">
      <header className="popup-header">
        <h1 className="accent-text">BANKAI <span style={{color: 'white'}}>SCRIPT</span></h1>
        <ShieldAlert size={18} className="status-icon" title="Bankai Protection Active" />
      </header>

      <div className="action-grid">
        <button className="bankai-button action-btn" onClick={handlePdfClick} disabled={isPdfLoading}>
          <FileText size={18} />
          {isPdfLoading ? 'PROCESSING...' : 'SAVE AS PDF'}
        </button>
        
        <button className="secondary-button action-btn" onClick={() => chrome.runtime.openOptionsPage()}>
          <Settings size={18} />
          DASHBOARD
        </button>
      </div>

      <div className="media-section">
        <h3>DETECTED MEDIA</h3>
        <div className="media-list">
          {detectedVideos.length > 0 ? (
            detectedVideos.map((video, i) => (
              <div key={i} className="media-item">
                <span className="media-label">Video Stream {i + 1}</span>
                <button className="icon-btn" onClick={() => handleDownload(video.src)}>
                  <Download size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">No media detected in current tab.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
