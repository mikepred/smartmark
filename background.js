/**
 * @fileoverview Background Script for SmartMark Extension
 * @module background
 * @description Handles background operations for the SmartMark Chrome extension including:
 * - Message handling from popup and content scripts
 * - Bookmark classification orchestration
 * - Bookmark saving with folder creation
 * - Fallback mechanisms for error scenarios
 */

import { getApiKey, getFolderPathFromLLM } from '/utils/api.js';
import { findOrCreateFolder, createBookmark } from '/utils/bookmark.js';
import { handleError } from '/utils/error.js';
import { sanitizeFolderPath, validateFolderName } from '/utils/validation.js';
import { config } from '/utils/config/index.js';

/**
 * Sets up message listener for runtime communications
 * @listens chrome.runtime.onMessage
 */
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

/**
 * Classifies the current active tab by extracting metadata and getting folder suggestions
 * @async
 * @param {Function} sendResponse - Chrome extension response callback
 * @returns {Promise<void>}
 * 
 * @description This function:
 * 1. Gets the current active tab
 * 2. Injects content script to extract metadata
 * 3. Retrieves API key (if needed)
 * 4. Calls AI API for folder classification
 * 5. Handles errors with fallback mechanism
 */
async function classifyCurrentTab(sendResponse) {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("No active tab found.");
    }

    // Set up metadata extraction timeout
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timed out while extracting page metadata.")), config.get('ui.metadataTimeout'));
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

    // Get folder suggestions from AI
    const folderSuggestions = await getFolderPathFromLLM(metadata, apiKey);
    sendResponse({ success: true, suggestions: folderSuggestions, metadata });
  } catch (error) {
    // Handle errors with fallback mechanism
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

/**
 * Handles fallback behavior when classification fails
 * @async
 * @param {chrome.tabs.Tab} tab - The current tab object
 * @param {string} originalErrorMessage - The original error message from classification
 * @param {Function} sendResponse - Chrome extension response callback
 * @returns {Promise<void>}
 * 
 * @description Falls back to saving bookmark in a default folder when classification fails.
 * This ensures bookmarks are never lost even if AI classification is unavailable.
 */
async function handleFallback(tab, originalErrorMessage, sendResponse) {
  try {
    const fallbackFolder = config.get('extension.fallbackFolder');
    const fallbackFolderId = await findOrCreateFolder(fallbackFolder);
    await createBookmark(fallbackFolderId, tab.title, tab.url);
    sendResponse({ success: false, error: `Saved to ${fallbackFolder}. ${originalErrorMessage}` });
  } catch (fallbackError) {
    const fallbackErrorMessage = handleError('Fallback', fallbackError, true);
    sendResponse({ success: false, error: fallbackErrorMessage });
  }
}
