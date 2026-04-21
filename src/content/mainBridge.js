// BankaiScript - Main World Bridge
// This script runs in the MAIN world to access page variables safely

(function() {
  function getBestStream(streamingData) {
    if (!streamingData) return null;
    
    // Prefer direct 'url' from formats (usually 360p/720p)
    const formats = streamingData.formats || [];
    const bestDirect = formats.find(f => f.url);
    if (bestDirect) return bestDirect.url;
    
    // Fallback to adaptive formats if they have a URL
    const adaptive = streamingData.adaptiveFormats || [];
    const bestAdaptive = adaptive.find(f => f.url);
    return bestAdaptive ? bestAdaptive.url : null;
  }

  function dispatchData() {
    const playerResponse = window.ytInitialPlayerResponse;
    const streamingData = playerResponse?.streamingData;
    const url = getBestStream(streamingData);
    
    if (url) {
      window.dispatchEvent(new CustomEvent('BankaiYTData', {
        detail: { url: url }
      }));
    }
  }

  // Poll for changes
  setInterval(dispatchData, 1000);
  console.log("Bankai Main Bridge Polling...");
})();
