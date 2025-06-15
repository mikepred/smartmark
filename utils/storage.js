// File: utils/storage.js

/**
 * Saves a key-value pair to local storage
 * @param {string} key - The key to save
 * @param {any} value - The value to save
 * @returns {Promise<void>}
 */
export async function saveToStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
}

/**
 * Retrieves a value from local storage by key
 * @param {string} key - The key to retrieve
 * @returns {Promise<any>} The value associated with the key
 */
export async function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

/**
 * Validates a Google API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if the API key matches the expected format, false otherwise
 */
export function validateApiKey(apiKey) {
  // Google API keys start with "AIza" and are 39 characters long
  const apiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
  return apiKeyPattern.test(apiKey);
}
