// background.js - Complete implementation
import { classifyBookmark } from './ai.js';
import { createBookmarkInFolder } from './bookmarks.js';

const METADATA_TIMEOUT = 5000;
const FALLBACK_FOLDER = 'Uncategorized';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'classify') {
    handleClassification(sendResponse);
    return true;
  }
  
  if (request.action === 'saveBookmark') {
    handleSaveBookmark(request, sendResponse);
    return true;
  }
});

async function handleClassification(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Extract metadata with timeout
    const metadata = await Promise.race([
      extractMetadata(tab.id),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Metadata timeout')), METADATA_TIMEOUT)
      )
    ]);
    
    // Get AI classification
    const suggestions = await classifyBookmark(metadata);
    
    sendResponse({ success: true, suggestions, metadata });
  } catch (error) {
    console.error('Classification error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function extractMetadata(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // Inline content extraction - no external script
      return {
        title: document.title,
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.content || '',
        // Only extract what's needed for classification
        content: Array.from(document.querySelectorAll('h1, h2, p'))
          .slice(0, 5)
          .map(el => el.textContent)
          .join(' ')
          .slice(0, 500)
      };
    }
  });
  
  return results[0]?.result;
}

async function handleSaveBookmark({ folderPath, metadata }, sendResponse) {
  try {
    await createBookmarkInFolder(folderPath, metadata.title, metadata.url);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    // Fallback to uncategorized
    try {
      await createBookmarkInFolder(FALLBACK_FOLDER, metadata.title, metadata.url);
      sendResponse({ success: true, fallback: true });
    } catch (fallbackError) {
      sendResponse({ success: false, error: fallbackError.message });
    }
  }
}
