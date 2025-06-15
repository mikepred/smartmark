import { getApiKey, getFolderPathFromLLM } from '/utils/api.js';
import { findOrCreateFolder, createBookmark } from '/utils/bookmark.js';
import { handleError } from '/utils/error.js';
import { sanitizeFolderPath, validateFolderName } from '/utils/validation.js';

// File: background.js

// ADD: introduce constant for metadata extraction timeout
const METADATA_TIMEOUT_MS = 10000; // 10 seconds timeout for metadata extraction

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'classify') {
    classifyCurrentTab(sendResponse);
    return true; // Indicates that the response is sent asynchronously
  }
  if (request.action === 'saveBookmarkWithFolder') {
    (async () => {
      try {
        const { folderPath, metadata } = request;
        const folderId = await findOrCreateFolder(folderPath);
        await createBookmark(folderId, metadata.title, metadata.url);
        sendResponse({ success: true, path: folderPath });
      } catch (error) {
        const errorMessage = handleError('Bookmark Save', error);
        sendResponse({ success: false, error: errorMessage });
      }
    })();
    return true;
  }
});

async function classifyCurrentTab(sendResponse) {
  // START REWRITE OF FUNCTION to add improved error handling
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("No active tab found.");
    }

    // Set up a timeout in case the script injection hangs or returns no data
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timed out while extracting page metadata.")), METADATA_TIMEOUT_MS);
    });

    // Inject content script and capture metadata
    const injectionPromise = (async () => {
      try {
        const injectionResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });

        if (!Array.isArray(injectionResults) || injectionResults.length === 0) {
          throw new Error('Failed to execute content script. No results returned.');
        }

        const metadata = injectionResults[0].result;
        if (!metadata || typeof metadata !== 'object' || !metadata.title) {
          throw new Error('Content script did not return valid metadata.');
        }
        return metadata;
      } catch (err) {
        throw new Error(`Script injection error: ${err.message}`);
      }
    })();

    // Race between metadata extraction and timeout
    const metadata = await Promise.race([injectionPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    // Retrieve API key (only needed for some providers like Gemini)
    let apiKey = null;
    try {
      apiKey = await getApiKey();
    } catch (error) {
      // API key not set - this is fine for local providers like LM Studio
      console.log('No API key set - using local LLM provider');
    }

    const folderSuggestions = await getFolderPathFromLLM(metadata, apiKey);
    sendResponse({ success: true, suggestions: folderSuggestions, metadata });
  } catch (error) {
    const errorMessage = handleError('Classification', error);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await handleFallback(tab, errorMessage, sendResponse);
    } catch (fallbackError) {
      // handleFallback already logs errors; ensure user gets final message
      sendResponse({ success: false, error: fallbackError.message || 'Unknown error during fallback.' });
    }
  }
}

async function handleFallback(tab, originalErrorMessage, sendResponse) {
  try {
    const fallbackFolderId = await findOrCreateFolder("Uncategorized");
    await createBookmark(fallbackFolderId, tab.title, tab.url);
    sendResponse({ success: false, error: `Saved to Uncategorized. ${originalErrorMessage}` });
  } catch (fallbackError) {
    const fallbackErrorMessage = handleError('Fallback', fallbackError, true);
    sendResponse({ success: false, error: fallbackErrorMessage });
  }
}
