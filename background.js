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
      // Enhanced content extraction with validation
      const metadata = {
        title: document.title || '',
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.content || '',
        content: ''
      };
      
      // Validate URL scheme and domain
      try {
        const urlObj = new URL(metadata.url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          throw new Error('Invalid protocol');
        }
        // Add basic domain validation
        if (urlObj.hostname.length === 0 || urlObj.hostname.includes('..')) {
          throw new Error('Invalid hostname');
        }
      } catch (e) {
        return null; // Reject invalid URLs
      }
      
      // Enhanced content extraction with coherence checks
      const contentElements = Array.from(document.querySelectorAll('h1, h2, h3, p, article, main'))
        .slice(0, 8)
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 10 && text.length < 200)
        .filter(text => !containsSuspiciousPatterns(text));
      
      metadata.content = contentElements.join(' ').slice(0, 400);
      
      // Content coherence validation
      if (!validateContentCoherence(metadata)) {
        metadata.content = metadata.content.slice(0, 200); // Truncate suspicious content
      }
      
      return metadata;
      
      function containsSuspiciousPatterns(text) {
        const suspiciousPatterns = [
          /system:?\s*you\s+are/i,
          /ignore\s+(previous|above|all)/i,
          /javascript:/i,
          /data:/i,
          /<script/i,
          /eval\s*\(/i,
          /document\.write/i
        ];
        return suspiciousPatterns.some(pattern => pattern.test(text));
      }
      
      function validateContentCoherence(metadata) {
        // Basic coherence checks
        const titleWords = metadata.title.toLowerCase().split(/\s+/).slice(0, 5);
        const contentWords = metadata.content.toLowerCase().split(/\s+/);
        
        // Check if title relates to content (basic semantic check)
        const overlap = titleWords.filter(word => 
          word.length > 3 && contentWords.some(cWord => cWord.includes(word))
        );
        
        return overlap.length > 0 || metadata.content.length < 100;
      }
    }
  });
  
  const result = results[0]?.result;
  
  // Server-side validation
  if (!result || !validateExtractedMetadata(result)) {
    throw new Error('Invalid or suspicious metadata extracted');
  }
  
  return result;
}

function validateExtractedMetadata(metadata) {
  // Content validation policy
  const policy = {
    maxTitleLength: 120,
    maxDescriptionLength: 300,
    maxContentLength: 400,
    allowedProtocols: ['http:', 'https:']
  };
  
  // Validate structure
  if (!metadata || typeof metadata !== 'object') return false;
  
  // Validate title
  if (!metadata.title || metadata.title.length > policy.maxTitleLength) return false;
  
  // Validate URL
  try {
    const url = new URL(metadata.url);
    if (!policy.allowedProtocols.includes(url.protocol)) return false;
  } catch (e) {
    return false;
  }
  
  // Validate content lengths
  if (metadata.description && metadata.description.length > policy.maxDescriptionLength) return false;
  if (metadata.content && metadata.content.length > policy.maxContentLength) return false;
  
  return true;
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
