// File: utils/error.js

/**
 * Formats and logs an error message, returning a user-friendly version
 * @param {string} context - The context or operation where the error occurred
 * @param {Error|string} error - The error object or message
 * @param {boolean} isFallback - Whether this is a fallback error after a primary failure
 * @returns {string} A formatted user-friendly error message
 */
export function handleError(context, error, isFallback = false) {
  const errorMessage = error instanceof Error ? error.message : error.toString();
  const logMessage = `${context} Error: ${errorMessage}`;
  console.error(logMessage);
  
  const userMessage = isFallback 
    ? `Fallback failed after ${context.toLowerCase()}. ${errorMessage}`
    : `${context} failed. ${errorMessage}`;
  
  return userMessage;
}

/**
 * Checks for runtime errors from chrome.runtime.lastError
 * @returns {string|null} The runtime error message if present, null otherwise
 */
export function checkRuntimeError() {
  if (chrome.runtime.lastError) {
    console.error('Runtime error:', chrome.runtime.lastError);
    return `Extension error: ${chrome.runtime.lastError.message}`;
  }
  return null;
}
