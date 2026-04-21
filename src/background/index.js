// BankaiScript Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log("BankaiScript Installed Successfully");
});

// Helper for PDF Generation
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

// Message Listener for UI Actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_PDF") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) capturePDF(tabs[0].id);
    });
  }
  
  if (message.type === "DOWNLOAD_MEDIA") {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || `Bankai_Download_${Date.now()}`,
      saveAs: true
    });
  }
  
  return true;
});
