// File: utils/error.js

/**
 * Enhanced error handling module for SmartMark extension
 * Provides comprehensive error handling with logging, notifications, and recovery
 */

// Re-export all error classes and utilities
export * from './error/errors.js';
export * from './error/logger.js';
export * from './error/notifier.js';

// Import necessary utilities
import { logger, logError } from './error/logger.js';
import { notifyError } from './error/notifier.js';
import { ExtensionError, SmartMarkError } from './error/errors.js';

/**
 * Global error handler setup
 */
let errorHandlerInitialized = false;

/**
 * Initialize global error handling
 */
export function initializeErrorHandling() {
  if (errorHandlerInitialized) return;
  
  // Handle unhandled promise rejections
  self.addEventListener('unhandledrejection', (event) => {
    const error = new ExtensionError(
      `Unhandled promise rejection: ${event.reason}`,
      'background'
    );
    logError(error);
    notifyError(error);
    event.preventDefault();
  });
  
  // Handle global errors
  self.addEventListener('error', (event) => {
    const error = new ExtensionError(
      `Global error: ${event.message}`,
      'background'
    );
    logError(error);
    notifyError(error);
    event.preventDefault();
  });
  
  errorHandlerInitialized = true;
  logger.info('Error handling initialized');
}

/**
 * Enhanced error handler with logging and notifications
 * @param {string} context - The context or operation where the error occurred
 * @param {Error|string} error - The error object or message
 * @param {boolean} isFallback - Whether this is a fallback error after a primary failure
 * @returns {string} A formatted user-friendly error message
 */
export function handleError(context, error, isFallback = false) {
  // Convert to proper error object if needed
  const errorObj = error instanceof Error ? error : new Error(error.toString());
  
  // Log the error
  logError(errorObj, { context, isFallback });
  
  // Notify user if it's a SmartMarkError with appropriate severity
  if (errorObj instanceof SmartMarkError) {
    notifyError(errorObj);
  }
  
  // Generate user message
  const userMessage = isFallback 
    ? `Fallback failed after ${context.toLowerCase()}. ${errorObj.message}`
    : `${context} failed. ${errorObj.message}`;
  
  return userMessage;
}

/**
 * Checks for runtime errors from chrome.runtime.lastError
 * @returns {string|null} The runtime error message if present, null otherwise
 */
export function checkRuntimeError() {
  if (chrome.runtime.lastError) {
    const error = new ExtensionError(
      chrome.runtime.lastError.message,
      'runtime'
    );
    logError(error);
    return `Extension error: ${chrome.runtime.lastError.message}`;
  }
  return null;
}

/**
 * Wrap an async function with error handling
 * @param {Function} fn - The async function to wrap
 * @param {string} context - The context for error reporting
 * @returns {Function} The wrapped function
 */
export function withErrorHandling(fn, context) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      handleError(context, error);
      throw error; // Re-throw to maintain original behavior
    }
  };
}

/**
 * Try-catch wrapper with automatic error handling
 * @param {Function} fn - The function to execute
 * @param {string} context - The context for error reporting
 * @param {*} fallbackValue - Value to return on error
 * @returns {*} The function result or fallback value
 */
export async function tryWithFallback(fn, context, fallbackValue = null) {
  try {
    return await fn();
  } catch (error) {
    handleError(context, error);
    return fallbackValue;
  }
}

/**
 * Error recovery strategies
 */
export const RecoveryStrategy = {
  RETRY: 'retry',
  FALLBACK: 'fallback',
  IGNORE: 'ignore',
  FAIL: 'fail'
};

/**
 * Execute with recovery strategy
 * @param {Function} fn - The function to execute
 * @param {Object} options - Recovery options
 * @returns {*} The function result
 */
export async function executeWithRecovery(fn, options = {}) {
  const {
    context = 'Operation',
    strategy = RecoveryStrategy.FAIL,
    maxRetries = 3,
    retryDelay = 1000,
    fallbackValue = null,
    onError = null
  } = options;
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (onError) {
        onError(error, attempt);
      }
      
      if (strategy === RecoveryStrategy.RETRY && attempt < maxRetries) {
        logger.warn(`${context} failed, retrying...`, { attempt, maxRetries });
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
      
      break;
    }
  }
  
  // Handle final error based on strategy
  switch (strategy) {
    case RecoveryStrategy.FALLBACK:
      handleError(context, lastError);
      return fallbackValue;
    
    case RecoveryStrategy.IGNORE:
      logger.warn(`${context} failed but ignored`, { error: lastError });
      return null;
    
    case RecoveryStrategy.FAIL:
    default:
      handleError(context, lastError);
      throw lastError;
  }
}
